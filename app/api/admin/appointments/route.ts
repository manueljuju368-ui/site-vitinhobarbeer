import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {ADMIN_COOKIE, verifyAdminSession} from '@/lib/admin-session';
import {isCalendarDate} from '@/lib/booking-date';
import {barbers, services} from '@/lib/data';
import {brazilDateTime, clockMinutes, fallbackHours, rangesOverlap} from '@/lib/schedule';
import {createAdminClient} from '@/utils/supabase/server';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const updateInput = z.object({
  id: z.string().uuid(),
  status: z.enum([
    'aguardando confirmação',
    'confirmado',
    'concluído',
    'cancelado',
    'não compareceu',
  ]),
}).strict();

const manualInput = z.object({
  name: z.string().trim().min(3).max(100),
  phone: z.string().transform((value) => value.replace(/\D/g, '')).pipe(
    z.string().regex(/^(?:\d{10,11}|55\d{10,11})$/),
  ),
  serviceId: z.string().min(1).max(50),
  barberName: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
}).strict();

const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const authorized = (request: NextRequest) => verifyAdminSession(
  request.cookies.get(ADMIN_COOKIE)?.value,
  process.env.ADMIN_SESSION_SECRET,
);

const normalizePhone = (value: string) => (
  value.startsWith('55') && value.length >= 12 ? value : `55${value}`
);

export async function GET(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({error: 'Não autorizado.'}, {status: 401});
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({error: 'Banco indisponível.'}, {status: 503});

  const requestedDate = request.nextUrl.searchParams.get('date') || today();
  if (!datePattern.test(requestedDate)) {
    return NextResponse.json({error: 'Data inválida.'}, {status: 400});
  }

  const {data, error} = await db
    .from('appointments')
    .select('id,start_datetime,price,status,customer_notes,customers(name,phone),barbers(name),services(name,duration_minutes)')
    .eq('appointment_date', requestedDate)
    .order('start_datetime');

  if (error) return NextResponse.json({error: 'Não foi possível carregar a agenda.'}, {status: 500});
  return NextResponse.json({appointments: data || [], date: requestedDate});
}

export async function POST(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({error: 'Não autorizado.'}, {status: 401});
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({error: 'Banco indisponível.'}, {status: 503});

  try {
    const body = manualInput.parse(await request.json());
    if (!isCalendarDate(body.date)) {
      return NextResponse.json({error: 'Escolha uma data válida.'}, {status: 400});
    }

    const configuredService = services.find((service) => service.id === body.serviceId);
    const configuredBarber = barbers.find((barber) => barber.name === body.barberName);
    if (!configuredService || configuredService.duration === null || !configuredBarber) {
      return NextResponse.json({error: 'Serviço ou profissional indisponível.'}, {status: 400});
    }

    const [serviceResult, barbersResult] = await Promise.all([
      db.from('services').select('id,price,duration_minutes').eq('id', body.serviceId).eq('active', true).single(),
      db.from('barbers').select('id,name').eq('active', true),
    ]);
    if (serviceResult.error || barbersResult.error) {
      return NextResponse.json({error: 'Não foi possível consultar a agenda.'}, {status: 503});
    }

    const service = serviceResult.data;
    const barber = barbersResult.data?.find((entry) => entry.name === body.barberName);
    if (!service || !barber) {
      return NextResponse.json({error: 'Serviço ou profissional indisponível.'}, {status: 400});
    }

    const start = brazilDateTime(body.date, body.time);
    const duration = service.duration_minutes || configuredService.duration;
    const end = new Date(start.getTime() + duration * 60_000);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      return NextResponse.json({error: 'Escolha um horário futuro.'}, {status: 400});
    }

    const weekday = new Date(`${body.date}T12:00:00-03:00`).getDay();
    const defaultHours = fallbackHours(weekday);
    if (!defaultHours) {
      return NextResponse.json({error: 'A barbearia está fechada nesta data.'}, {status: 400});
    }

    const dayStart = new Date(`${body.date}T00:00:00-03:00`);
    const dayEnd = new Date(`${body.date}T23:59:59-03:00`);
    const [hoursResult, breaksResult, blockedResult] = await Promise.all([
      db.from('working_hours').select('start_time,end_time').eq('barber_id', barber.id).eq('weekday', weekday).eq('active', true).order('id', {ascending: false}).limit(1).maybeSingle(),
      db.from('breaks').select('start_time,end_time').eq('barber_id', barber.id).eq('weekday', weekday),
      db.from('blocked_times').select('start_datetime,end_datetime').eq('barber_id', barber.id).lt('start_datetime', dayEnd.toISOString()).gt('end_datetime', dayStart.toISOString()),
    ]);
    if (hoursResult.error || breaksResult.error || blockedResult.error) {
      return NextResponse.json({error: 'Não foi possível validar este horário.'}, {status: 503});
    }

    const hours = hoursResult.data
      ? {
          start: hoursResult.data.start_time.slice(0, 5),
          end: hoursResult.data.end_time.slice(0, 5),
        }
      : defaultHours;
    const startMinute = clockMinutes(body.time);
    const step = duration <= 30 ? 30 : 60;
    const insideSchedule = startMinute >= clockMinutes(hours.start)
      && startMinute + duration <= clockMinutes(hours.end)
      && (startMinute - clockMinutes(hours.start)) % step === 0;
    if (!insideSchedule) {
      return NextResponse.json({error: 'Este horário está fora da grade de atendimento.'}, {status: 400});
    }

    const unavailableRanges = [
      ...(blockedResult.data || []),
      ...(breaksResult.data || []).map((entry) => ({
        start_datetime: `${body.date}T${entry.start_time.slice(0, 5)}:00-03:00`,
        end_datetime: `${body.date}T${entry.end_time.slice(0, 5)}:00-03:00`,
      })),
    ];
    if (rangesOverlap(start, end, unavailableRanges)) {
      return NextResponse.json({error: 'Este horário está bloqueado.'}, {status: 409});
    }

    const {data: customer, error: customerError} = await db
      .from('customers')
      .upsert({name: body.name, phone: normalizePhone(body.phone)}, {onConflict: 'phone'})
      .select('id')
      .single();
    if (customerError || !customer) throw customerError;

    const {data: appointment, error} = await db.from('appointments').insert({
      customer_id: customer.id,
      barber_id: barber.id,
      service_id: service.id,
      appointment_date: body.date,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      price: service.price,
      status: 'confirmado',
    }).select('id').single();

    if (error || !appointment) {
      return NextResponse.json({
        error: error?.code === '23P01'
          ? 'Este horário acabou de ser ocupado.'
          : 'Não foi possível criar o agendamento.',
      }, {status: error?.code === '23P01' ? 409 : 500});
    }

    return NextResponse.json({ok: true, id: appointment.id}, {status: 201});
  } catch {
    return NextResponse.json({error: 'Confira os dados do agendamento.'}, {status: 400});
  }
}

export async function PATCH(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({error: 'Não autorizado.'}, {status: 401});
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({error: 'Banco indisponível.'}, {status: 503});

  try {
    const {id, status} = updateInput.parse(await request.json());
    const {data, error} = await db
      .from('appointments')
      .update({status, updated_at: new Date().toISOString()})
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({error: 'Não foi possível atualizar o agendamento.'}, {status: 500});
    }
    return NextResponse.json({ok: true});
  } catch {
    return NextResponse.json({error: 'Dados inválidos.'}, {status: 400});
  }
}
