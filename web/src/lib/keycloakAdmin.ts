// /Users/gentlebookpro/Projekte/checkpoint/web/src/lib/keycloakAdmin.ts
import qs from "querystring";

const KC_BASE = process.env.KC_BASE_URL || "http://localhost:8080";
const KC_REALM = process.env.KC_REALM || "checkpoint";
const KC_CLIENT_ID = process.env.KC_CLIENT_ID || "";

type CreateUserInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  emailVerified?: boolean;
  enabled?: boolean;
};

export async function getAdminAccessToken(): Promise<string> {
  const url = `${KC_BASE}/realms/${encodeURIComponent(KC_REALM)}/protocol/openid-connect/token`;
  const body = qs.stringify({
    grant_type: "password",
    client_id: KC_CLIENT_ID,
    username: 'admin',
    password: 'p',
    scope: 'openid',

  });
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`KC token failed (${r.status}): ${await r.text()}`);
  const j = await r.json();
  return j.access_token as string;
}

export async function findUserByUsernameOrEmail(q: string): Promise<{ id: string } | null> {
  const token = await getAdminAccessToken();
  // exact username
  let r = await fetch(`${KC_BASE}/admin/realms/${encodeURIComponent(KC_REALM)}/users?${qs.stringify({ username: q, exact: true })}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
  });
  if (r.ok) {
    const arr = await r.json();
    if (Array.isArray(arr) && arr.length > 0) return { id: arr[0].id };
  }
  // exact email
  r = await fetch(`${KC_BASE}/admin/realms/${encodeURIComponent(KC_REALM)}/users?${qs.stringify({ email: q, exact: true })}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
  });
  if (r.ok) {
    const arr = await r.json();
    if (Array.isArray(arr) && arr.length > 0) return { id: arr[0].id };
  }
  return null;
}

export async function createUser(input: CreateUserInput): Promise<{ id: string }> {
  const token = await getAdminAccessToken();

  const res = await fetch(`${KC_BASE}/admin/realms/${encodeURIComponent(KC_REALM)}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      username: input.username || input.email,
      email: input.email,
      firstName: input.firstName || "",
      lastName: input.lastName || "",
      enabled: input.enabled ?? true,
      emailVerified: input.emailVerified ?? false,
      attributes: input.phone ? { phone: [input.phone] } : undefined,
    }),
  });

  if (res.status === 409) {
    const exist = await findUserByUsernameOrEmail(input.username || input.email);
    if (exist?.id) return { id: exist.id };
    throw new Error(`KC create conflict`);
  }

  if (!(res.status === 201 || res.status === 204)) {
    throw new Error(`KC create failed (${res.status}): ${await res.text()}`);
  }

  const location = res.headers.get("location") || "";
  const id = location.split("/").pop();
  if (!id) {
    const fallback = await findUserByUsernameOrEmail(input.username || input.email);
    if (!fallback?.id) throw new Error("KC user created but id not found");
    return { id: fallback.id };
  }
  return { id };
}

export async function setUserTempPassword(userId: string, password: string) {
  const token = await getAdminAccessToken();
  const r = await fetch(`${KC_BASE}/admin/realms/${encodeURIComponent(KC_REALM)}/users/${encodeURIComponent(userId)}/reset-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type: "password", value: password, temporary: false }),
  });
  if (!r.ok) throw new Error(`KC set password failed (${r.status}): ${await r.text()}`);
}