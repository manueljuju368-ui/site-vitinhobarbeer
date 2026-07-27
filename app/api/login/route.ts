import {NextResponse} from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminSession,
} from '@/lib/admin-session';
import {clearRateLimit, rateLimited, requestIp} from '@/lib/rate-limit';

export async function POST(request: Request) {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !sessionSecret || sessionSecret.length < 32) {
    return NextResponse.json({error: 'Painel não configurado.'}, {status: 503});
  }

  const limitKey = `login:${requestIp(request)}`;
  if (rateLimited(limitKey, 5, 15 * 60_000)) {
    return NextResponse.json(
      {error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.'},
      {status: 429, headers: {'Retry-After': '900'}},
    );
  }

  try {
    const body = await request.json();
    if (typeof body.password !== 'string' || body.password !== password) {
      return NextResponse.json({error: 'Credenciais inválidas.'}, {status: 401});
    }

    clearRateLimit(limitKey);
    const response = NextResponse.json({ok: true});
    response.cookies.set(ADMIN_COOKIE, await createAdminSession(sessionSecret), {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: ADMIN_SESSION_SECONDS,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({error: 'Requisição inválida.'}, {status: 400});
  }
}
