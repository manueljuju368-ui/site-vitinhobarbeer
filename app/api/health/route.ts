import {NextResponse} from 'next/server';
import {createAdminClient} from '@/utils/supabase/server';

export async function GET() {
  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({
      status: 'degraded',
      database: false,
      checks: {configuration: false},
    }, {status: 503});
  }

  const tableChecks = {
    barbers: db.from('barbers').select('id', {count: 'exact', head: true}).eq('active', true),
    services: db.from('services').select('id', {count: 'exact', head: true}).eq('active', true),
    customers: db.from('customers').select('id', {count: 'exact', head: true}),
    appointments: db.from('appointments').select('id', {count: 'exact', head: true}),
    workingHours: db.from('working_hours').select('id', {count: 'exact', head: true}),
    breaks: db.from('breaks').select('id', {count: 'exact', head: true}),
    blockedTimes: db.from('blocked_times').select('id', {count: 'exact', head: true}),
  };
  const names = Object.keys(tableChecks) as Array<keyof typeof tableChecks>;
  const results = await Promise.all(names.map((name) => tableChecks[name]));
  const checks = Object.fromEntries(results.map((result, index) => [
    names[index],
    !result.error,
  ]));
  const barbersReady = !results[0].error && (results[0].count || 0) > 0;
  const servicesReady = !results[1].error && (results[1].count || 0) > 0;
  const databaseReady = barbersReady && servicesReady && results.every((result) => !result.error);

  if (!databaseReady) {
    return NextResponse.json({status: 'degraded', database: false, checks}, {status: 503});
  }

  return NextResponse.json({status: 'ok', database: true, checks});
}
