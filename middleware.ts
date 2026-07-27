import {NextRequest, NextResponse} from 'next/server';
import {ADMIN_COOKIE, verifyAdminSession} from '@/lib/admin-session';

export async function middleware(request: NextRequest) {
  const logged = await verifyAdminSession(
    request.cookies.get(ADMIN_COOKIE)?.value,
    process.env.ADMIN_SESSION_SECRET,
  );
  if (logged) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({error: 'Não autorizado.'}, {status: 401});
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {matcher: ['/admin/:path*', '/api/admin/:path*']};
