import {NextResponse} from 'next/server';
import {z} from 'zod';
import {isCalendarDate} from '@/lib/booking-date';
import {barbers, services} from '@/lib/data';
import {demoAppointments} from '@/lib/demo-appointments';
import {rateLimited, requestIp} from '@/lib/rate-limit';
import {brazilDateTime, clockMinutes, fallbackHours, rangesOverlap} from '@/lib/schedule';
import {createAdminClient} from '@/utils/supabase/server';

const input = z.object({
  name: z.string().trim().min(3).max(100),
  phone: z.string().regex(/^(?:\d{10,11}|55\d{10,11})$/),
  serviceId: z.string().min(1).max(50),
  barberName: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
}).strict();

const todayInBrazil = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const maxBookingDate = () => {
  const date = new Date(`${todayInBrazil()}T12:00:00-03:00`);
  date.setDate(date.getDate() + 21);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
};

export async function POST(request: Request) {
  if (rateLimited(`booking:${requestIp(request)}`, 8, 10 * 60_000)) {
    return NextResponse.json(
      {error: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.'},
      {status: 429, headers: {'Retry-After': '600'}},
    );
  }

  try {
    const body = input.parse(await request.json());
    const selectedService = services.find((service) => service.id === body.serviceId);
    const selectedBarber = barbers.find((barber) => barber.name === body.barberName);

    if (!selectedService || !selectedBarber || selectedService.duration === null) {
      return NextResponse.json({error: 'Serviço ou profissional indisponível.'}, {status: 400});
    }

    if (!isCalendarDate(body.date) || body.date < todayInBrazil() || body.date > maxBookingDate()) {
      return NextResponse.json({error: 'Escolha uma data dentro do período disponível.'}, {status: 400});
    }

    const start = brazilDateTime(body.date, body.time);
    const weekday = new Date(`${body.date}T12:00:00-03:00`).getDay();
    const defaultHours = fallbackHours(weekday);
    const minimumStart = Date.now() + 60 * 60_000;
    if (!defaultHours || Number.isNaN(start.getTime()) || start.getTime() < minimumStart) {
      return NextResponse.json({error: 'Este horário não está mais disponível.'}, {status: 400});
    }

    const db = createAdminClient();
    if (!db) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          {error: 'O agendamento está temporariamente indisponível. Fale com a gente pelo WhatsApp.'},
          {status: 503},
        );
      }

      const duration = selectedService.duration || 60;
      const end = new Date(start.getTime() + duration * 60_000);
      const startMinute = clockMinutes(body.time);
      const step = duration <= 30 ? 30 : 60;
      const withinHours = startMinute >= clockMinutes(defaultHours.start)
        && startMinute + duration <= clockMinutes(defaultHours.end)
        && (startMinute - clockMinutes(defaultHours.start)) % step === 0;

      if (!withinHours) {
        return NextResponse.json({error: 'Escolha um dos horários exibidos na agenda.'}, {status: 400});
      }

      const conflict = demoAppointments.some((appointment) => {
        if (appointment.barber !== body.barberName || appointment.date !== body.date) return false;
        const existingService = services.find((service) => service.id === appointment.service);
        const existingStart = new Date(`${appointment.date}T${appointment.time}:00-03:00`);
        const existingEnd = new Date(existingStart.getTime() + (existingService?.duration || 60) * 60_000);
        return start < existingEnd && end > existingStart;
      });
      if (conflict) {
        return NextResponse.json({error: 'Este horário já foi reservado.'}, {status: 409});
      }

      demoAppointments.push({
        barber: body.barberName,
        service: body.serviceId,
        date: body.date,
        time: body.time,
        name: body.name,
        phone: normalizePhone(body.phone),
      });
      return NextResponse.json({ok: true, demo: true});
    }

    const [serviceResult, barbersResult] = await Promise.all([
      db.from('services').select('id,price,duration_minutes').eq('id', body.serviceId).eq('active', true).single(),
      db.from('barbers').select('id,name').eq('active', true),
    ]);
    if (serviceResult.error || barbersResult.error) {
      return NextResponse.json({error: 'A agenda está temporariamente indisponível.'}, {status: 503});
    }
    const service = serviceResult.data;
    const activeBarbers = barbersResult.data;
    if (!service || !activeBarbers?.length) {
      return NextResponse.json({error: 'Serviço indisponível.'}, {status: 400});
    }

    const barber = activeBarbers.find((entry) => entry.name === body.barberName);
    if (!barber) {
      return NextResponse.json({error: 'Profissional indisponível.'}, {status: 400});
    }

    const duration = service.duration_minutes || selectedService.duration || 60;
    const end = new Date(start.getTime() + duration * 60_000);
    const dayStart = new Date(`${body.date}T00:00:00-03:00`);
    const dayEnd = new Date(`${body.date}T23:59:59-03:00`);
    const [hoursResult, breaksResult, blockedResult] = await Promise.all([
      db.from('working_hours').select('start_time,end_time').eq('barber_id', barber.id).eq('weekday', weekday).eq('active', true).order('id', {ascending: false}).limit(1).maybeSingle(),
      db.from('breaks').select('start_time,end_time').eq('barber_id', barber.id).eq('weekday', weekday),
      db.from('blocked_times').select('start_datetime,end_datetime').eq('barber_id', barber.id).lt('start_datetime', dayEnd.toISOString()).gt('end_datetime', dayStart.toISOString()),
    ]);
    if (hoursResult.error || breaksResult.error || blockedResult.error) {
      return NextResponse.json({error: 'A agenda está temporariamente indisponível.'}, {status: 503});
    }
    const hours = hoursResult.data;
    const breaks = breaksResult.data;
    const blocked = blockedResult.data;

    const open = hours
      ? {start: hours.start_time.slice(0, 5), end: hours.end_time.slice(0, 5)}
      : defaultHours;
    const startMinute = clockMinutes(body.time);
    const step = duration <= 30 ? 30 : 60;
    const alignedWithSchedule = (startMinute - clockMinutes(open.start)) % step === 0;
    const withinHours = startMinute >= clockMinutes(open.start)
      && startMinute + duration <= clockMinutes(open.end);
    const unavailableRanges = [
      ...(blocked || []),
      ...(breaks || []).map((entry) => ({
        start_datetime: `${body.date}T${entry.start_time.slice(0, 5)}:00-03:00`,
        end_datetime: `${body.date}T${entry.end_time.slice(0, 5)}:00-03:00`,
      })),
    ];

    if (!withinHours || !alignedWithSchedule) {
      return NextResponse.json({error: 'Escolha um dos horários exibidos na agenda.'}, {status: 400});
    }

    if (rangesOverlap(start, end, unavailableRanges)) {
      return NextResponse.json({error: 'Este horário está indisponível.'}, {status: 409});
    }

    const {data: customer, error: customerError} = await db
      .from('customers')
      .upsert({name: body.name, phone: normalizePhone(body.phone)}, {onConflict: 'phone'})
      .select('id')
      .single();
    if (customerError || !customer) {
      return NextResponse.json(
        {error: 'Não foi possível salvar seus dados agora. Tente novamente.'},
        {status: 503},
      );
    }

    const {error} = await db.from('appointments').insert({
      customer_id: customer.id,
      barber_id: barber.id,
      service_id: service.id,
      appointment_date: body.date,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      price: service.price,
    });
    if (error) {
      const conflict = error.code === '23P01';
      return NextResponse.json({
        error: conflict
          ? 'Este horário acabou de ser reservado. Escolha outro.'
          : 'O banco não conseguiu registrar o agendamento. Tente novamente.',
      }, {status: conflict ? 409 : 503});
    }

    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json({error: 'Confira os dados informados.'}, {status: 400});
    }
    return NextResponse.json(
      {error: 'A agenda não conseguiu acessar o banco agora. Tente novamente.'},
      {status: 503},
    );
  }
}
