// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/auth/refresh/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RefreshResponse = {
  data?: {
    refresh?: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      refresh_expires_in: number;
    };
  };
  errors?: any;
};

function cookieOpts(maxAgeSec?: number) {
  const secure = process.env.COOKIE_SECURE === 'true';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const base = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    domain,
  };
  if (typeof maxAgeSec === 'number') return { ...base, maxAge: maxAgeSec };
  return base;
}

export async function POST(_req: NextRequest) {
  const accessName =
    process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || 'kc_access_token';
  const refreshName =
    process.env.NEXT_PUBLIC_REFRESH_COOKIE_NAME || 'kc_refresh_token';
  const rt = cookies().get(refreshName)?.value;
  if (!rt) return NextResponse.json({ ok: false }, { status: 401 });

  const endpoint = process.env.NEXT_PUBLIC_BACKEND_GRAPHQL_URL!;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation Refresh($refreshToken: String!) {
          refresh(refresh_token: $refreshToken) {
            access_token
            refresh_token
            expires_in
            refresh_expires_in
          }
        }
      `,
      variables: { refreshToken: rt },
    }),
    cache: 'no-store',
  });

  const json = (await res.json()) as RefreshResponse;
  if (!res.ok || json.errors || !json.data?.refresh) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { access_token, refresh_token, expires_in, refresh_expires_in } =
    json.data.refresh;

  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(accessName, access_token, cookieOpts(expires_in));
  response.cookies.set(
    refreshName,
    refresh_token,
    cookieOpts(refresh_expires_in),
  );
  return response;
}
