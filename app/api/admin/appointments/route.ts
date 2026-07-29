import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {ADMIN_COOKIE, verifyAdminSession} from '@/lib/admin-session';
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
