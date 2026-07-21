import {NextRequest,NextResponse} from 'next/server';
export function middleware(req:NextRequest){const logged=req.cookies.get('vitinho_admin')?.value===process.env.ADMIN_SESSION_SECRET;if(!logged)return NextResponse.redirect(new URL('/login',req.url));return NextResponse.next()}
export const config={matcher:['/admin/:path*','/api/admin/:path*']};
