import {NextResponse} from 'next/server';
import {createAdminClient} from '@/utils/supabase/server';

export async function GET() {
  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({status: 'degraded', database: false}, {status: 503});
  }

  const {count, error} = await db
    .from('barbers')
    .select('id', {count: 'exact', head: true})
    .eq('active', true);

  if (error || !count) {
    return NextResponse.json({status: 'degraded', database: false}, {status: 503});
  }

  return NextResponse.json({status: 'ok', database: true});
}
