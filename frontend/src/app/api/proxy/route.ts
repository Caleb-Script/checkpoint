import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProxyMethod = "GET" | "POST" | "PUT" | "DELETE";

interface ProxyRequestBody {
  url: string;
  method?: ProxyMethod;
  headers?: Record<string, string>;
  body?: string | object | null;
}

/**
 * POST /api/proxy
 * Body:
 * {
 *   url: string,        // Ziel-URL (z. B. http://localhost:5001/graphql)
 *   method?: "GET"|"POST"|"PUT"|"DELETE"
 *   headers?: Record<string, string>
 *   body?: string | object | null
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let parsed: ProxyRequestBody;
  try {
    parsed = (await req.json()) as ProxyRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, method = "POST", headers: hdr = {}, body } = parsed;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const accessCookieName =
    process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME || "kc_access_token";
  const store = await cookies();
  const access = store.get(accessCookieName)?.value;

  const upstreamHeaders: Record<string, string> = {
    ...hdr,
    "Content-Type": hdr["Content-Type"] || "application/json",
  };

  // Access-Token nur serverseitig anfügen
  if (access) {
    upstreamHeaders["Authorization"] = `Bearer ${access}`;
  }

  const init: RequestInit = {
    method,
    headers: upstreamHeaders,
    body: body
      ? typeof body === "string"
        ? body
        : JSON.stringify(body)
      : undefined,
    cache: "no-store",
  };

  let res = await fetch(url, init);

  // 401? Einmal Refresh über den Auth-Service und Retry
  if (res.status === 401) {
    const BACKEND =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

    const refreshRes = await fetch(`${BACKEND}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: store
          .getAll()
          .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
          .join("; "),
      },
      cache: "no-store",
    });

    if (refreshRes.ok) {
      res = await fetch(url, init);
    }
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  });
}
