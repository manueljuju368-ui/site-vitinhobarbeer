import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import AdminAgenda from '@/components/AdminAgenda';
import {ADMIN_COOKIE, verifyAdminSession} from '@/lib/admin-session';

export default async function Admin() {
  const cookieStore = await cookies();
  const logged = await verifyAdminSession(
    cookieStore.get(ADMIN_COOKIE)?.value,
    process.env.ADMIN_SESSION_SECRET,
  );

  if (!logged) redirect('/login?next=/admin');

  return <AdminAgenda />;
}
