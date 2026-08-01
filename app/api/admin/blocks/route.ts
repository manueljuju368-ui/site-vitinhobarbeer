import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {ADMIN_COOKIE, verifyAdminSession} from '@/lib/admin-session';
import {isCalendarDate} from '@/lib/booking-date';
import {barbers} from '@/lib/data';
import {brazilDateTime} from '@/lib/schedule';
import {createAdminClient} from '@/utils/supabase/server';

const blockInput = z.object({
  barberName: z.string().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fullDay: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().trim().max(120).optional(),
}).strict();

const deleteInput = z.object({id: z.string().uuid()}).strict();

const authorized = (request: NextRequest) => verifyAdminSession(
  request.cookies.get(ADMIN_COOKIE)?.value,
  process.env.ADMIN_SESSION_SECRET,
);

const dayRange = (date: string) => {
  const start = brazilDateTime(date, '00:00');
  return {start, end: new Date(start.getTime() + 24 * 60 * 60_000)};
};

export async function GET(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({error: 'Não autorizado.'}, {status: 401});
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({error: 'Banco indisponível.'}, {status: 503});

  const date = request.nextUrl.searchParams.get('date') || '';
  if (!isCalendarDate(date)) {
    return NextResponse.json({error: 'Data inválida.'}, {status: 400});
  }

  const {start, end} = dayRange(date);
  const {data, error} = await db
    .from('blocked_times')
    .select('id,start_datetime,end_datetime,reason,barbers(name)')
    .lt('start_datetime', end.toISOString())
    .gt('end_datetime', start.toISOString())
    .order('start_datetime');

  if (error) return NextResponse.json({error: 'Não foi possível carregar os bloqueios.'}, {status: 500});
  return NextResponse.json({blocks: data || [], date});
}

export async function POST(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({error: 'Não autorizado.'}, {status: 401});
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({error: 'Banco indisponível.'}, {status: 503});

  try {
    const body = blockInput.parse(await request.json());
    if (!isCalendarDate(body.date) || !barbers.some((barber) => barber.name === body.barberName)) {
      return NextResponse.json({error: 'Data ou profissional inválido.'}, {status: 400});
    }

    const {data: barber, error: barberError} = await db
      .from('barbers')
      .select('id,name')
      .eq('name', body.barberName)
      .eq('active', true)
      .single();
    if (barberError || !barber) {
      return NextResponse.json({error: 'Profissional não encontrado.'}, {status: 404});
    }

    let start: Date;
    let end: Date;
    if (body.fullDay) {
      ({start, end} = dayRange(body.date));
    } else {
      if (!body.startTime || !body.endTime) {
        return NextResponse.json({error: 'Informe o início e o fim do bloqueio.'}, {status: 400});
      }
      start = brazilDateTime(body.date, body.startTime);
      end = brazilDateTime(body.date, body.endTime);
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({error: 'O período informado é inválido.'}, {status: 400});
    }

    const [appointmentsResult, blocksResult] = await Promise.all([
      db.from('appointments')
        .select('id')
        .eq('barber_id', barber.id)
        .lt('start_datetime', end.toISOString())
        .gt('end_datetime', start.toISOString())
        .not('status', 'in', '("cancelado","não compareceu")')
        .limit(1),
      db.from('blocked_times')
        .select('id')
        .eq('barber_id', barber.id)
        .lt('start_datetime', end.toISOString())
        .gt('end_datetime', start.toISOString())
        .limit(1),
    ]);
    if (appointmentsResult.error || blocksResult.error) {
      return NextResponse.json({error: 'Não foi possível validar o período.'}, {status: 503});
    }
    if (appointmentsResult.data?.length) {
      return NextResponse.json({error: 'Já existe um cliente agendado neste período.'}, {status: 409});
    }
    if (blocksResult.data?.length) {
      return NextResponse.json({error: 'Este período já está bloqueado.'}, {status: 409});
    }

    const {data, error} = await db.from('blocked_times').insert({
      barber_id: barber.id,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      reason: body.reason || (body.fullDay ? 'Dia indisponível' : 'Horário indisponível'),
    }).select('id').single();
    if (error || !data) {
      return NextResponse.json({error: 'Não foi possível bloquear o período.'}, {status: 500});
    }

    return NextResponse.json({ok: true, id: data.id}, {status: 201});
  } catch {
    return NextResponse.json({error: 'Confira os dados do bloqueio.'}, {status: 400});
  }
}

export async function DELETE(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({error: 'Não autorizado.'}, {status: 401});
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({error: 'Banco indisponível.'}, {status: 503});

  try {
    const {id} = deleteInput.parse(await request.json());
    const {data, error} = await db.from('blocked_times').delete().eq('id', id).select('id').single();
    if (error || !data) {
      return NextResponse.json({error: 'Não foi possível remover o bloqueio.'}, {status: 500});
    }
    return NextResponse.json({ok: true});
  } catch {
    return NextResponse.json({error: 'Bloqueio inválido.'}, {status: 400});
  }
}
