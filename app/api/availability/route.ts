import {NextRequest, NextResponse} from 'next/server';
import {isCalendarDate} from '@/lib/booking-date';
import {barbers, services} from '@/lib/data';
import {demoAppointments} from '@/lib/demo-appointments';
import {
  brazilDateTime,
  clockLabel,
  clockMinutes,
  fallbackHours,
  rangesOverlap,
  type ScheduleRange,
} from '@/lib/schedule';
import {createAdminClient} from '@/utils/supabase/server';

type Slot = {time: string; available: boolean; reason?: string};

const todayInBrazil = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const lastBookingDate = () => {
  const date = new Date(`${todayInBrazil()}T12:00:00-03:00`);
  date.setDate(date.getDate() + 21);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  const barberName = request.nextUrl.searchParams.get('barber');
  const serviceId = request.nextUrl.searchParams.get('service');

  if (!date || !barberName || !serviceId) {
    return NextResponse.json({error: 'Parâmetros incompletos.'}, {status: 400});
  }
  if (!isCalendarDate(date) || date < todayInBrazil() || date > lastBookingDate()) {
    return NextResponse.json({error: 'Data fora do período de agendamento.'}, {status: 400});
  }

  const selectedService = services.find((service) => service.id === serviceId);
  const selectedBarber = barbers.find((barber) => barber.name === barberName);
  if (!selectedService || !selectedBarber) {
    return NextResponse.json({error: 'Serviço ou profissional não encontrado.'}, {status: 404});
  }
  if (selectedService.duration === null) {
    return NextResponse.json(
      {error: 'Este serviço precisa ser combinado pelo WhatsApp.'},
      {status: 400},
    );
  }

  const weekday = new Date(`${date}T12:00:00-03:00`).getDay();
  const defaults = fallbackHours(weekday);
  if (!defaults) {
    return NextResponse.json({slots: [], closed: true, message: 'Fechado aos domingos.'});
  }

  const db = createAdminClient();
  if (!db) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {error: 'A agenda está temporariamente indisponível.'},
        {status: 503},
      );
    }

    const duration = selectedService.duration || 60;
    const step = duration <= 30 ? 30 : 60;
    const slots: Slot[] = [];

    for (let value = clockMinutes(defaults.start); value + duration <= clockMinutes(defaults.end); value += step) {
      const time = clockLabel(value);
      const start = brazilDateTime(date, time);
      const end = new Date(start.getTime() + duration * 60_000);
      const occupied = demoAppointments.some((appointment) => {
        if (appointment.date !== date || appointment.barber !== barberName) return false;
        const existingService = services.find((service) => service.id === appointment.service);
        const existingStart = new Date(`${appointment.date}T${appointment.time}:00-03:00`);
        const existingEnd = new Date(existingStart.getTime() + (existingService?.duration || 60) * 60_000);
        return start < existingEnd && end > existingStart;
      });
      const past = start.getTime() < Date.now() + 60 * 60_000;
      slots.push({
        time,
        available: !past && !occupied,
        reason: occupied ? 'ocupado' : past ? 'encerrado' : undefined,
      });
    }
    return NextResponse.json({slots, duration, demo: true});
  }

  try {
    const {data: activeBarbers, error: barbersError} = await db
      .from('barbers')
      .select('id,name')
      .eq('active', true);
    if (barbersError) {
      return NextResponse.json({error: 'A agenda está temporariamente indisponível.'}, {status: 503});
    }
    const barber = activeBarbers?.find((entry) => entry.name === barberName);
    if (!barber) {
      return NextResponse.json({error: 'Profissional não encontrado.'}, {status: 404});
    }

    const dayStart = new Date(`${date}T00:00:00-03:00`);
    const dayEnd = new Date(`${date}T23:59:59-03:00`);
    const [serviceResult, hoursResult, breaksResult, busyResult, blockedResult] = await Promise.all([
      db.from('services').select('duration_minutes').eq('id', serviceId).eq('active', true).single(),
      db.from('working_hours').select('start_time,end_time').eq('barber_id', barber.id).eq('weekday', weekday).eq('active', true).order('id', {ascending: false}).limit(1).maybeSingle(),
      db.from('breaks').select('start_time,end_time').eq('barber_id', barber.id).eq('weekday', weekday),
      db.from('appointments')
        .select('start_datetime,end_datetime')
        .eq('barber_id', barber.id)
        .gte('start_datetime', dayStart.toISOString())
        .lte('start_datetime', dayEnd.toISOString())
        .not('status', 'in', '("cancelado","não compareceu")'),
      db.from('blocked_times')
        .select('start_datetime,end_datetime')
        .eq('barber_id', barber.id)
        .lt('start_datetime', dayEnd.toISOString())
        .gt('end_datetime', dayStart.toISOString()),
    ]);
    const queryError = serviceResult.error
      || hoursResult.error
      || breaksResult.error
      || busyResult.error
      || blockedResult.error;
    if (queryError) {
      return NextResponse.json({error: 'A agenda está temporariamente indisponível.'}, {status: 503});
    }
    const service = serviceResult.data;
    const hours = hoursResult.data;
    const breaks = breaksResult.data;
    const busy = busyResult.data;
    const blocked = blockedResult.data;

    if (!service) {
      return NextResponse.json({error: 'Serviço indisponível.'}, {status: 404});
    }

    const open = hours
      ? {start: hours.start_time.slice(0, 5), end: hours.end_time.slice(0, 5)}
      : defaults;
    const duration = service.duration_minutes || selectedService.duration || 60;
    const step = duration <= 30 ? 30 : 60;
    const ranges: ScheduleRange[] = [
      ...(busy || []),
      ...(blocked || []),
      ...(breaks || []).map((entry) => ({
        start_datetime: `${date}T${entry.start_time.slice(0, 5)}:00-03:00`,
        end_datetime: `${date}T${entry.end_time.slice(0, 5)}:00-03:00`,
      })),
    ];
    const slots: Slot[] = [];

    for (let value = clockMinutes(open.start); value + duration <= clockMinutes(open.end); value += step) {
      const time = clockLabel(value);
      const start = brazilDateTime(date, time);
      const end = new Date(start.getTime() + duration * 60_000);
      const occupied = rangesOverlap(start, end, ranges);
      const past = start.getTime() < Date.now() + 60 * 60_000;
      slots.push({
        time,
        available: !past && !occupied,
        reason: occupied ? 'ocupado' : past ? 'encerrado' : undefined,
      });
    }

    return NextResponse.json({slots, duration, professional: barber.name});
  } catch {
    return NextResponse.json({error: 'A agenda está temporariamente indisponível.'}, {status: 503});
  }
}
