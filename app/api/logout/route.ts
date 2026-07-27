import {NextResponse} from 'next/server';
import {ADMIN_COOKIE} from '@/lib/admin-session';

export async function POST() {
  const response = NextResponse.json({ok: true});
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
  return response;
}
