// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/api/admin/invitations/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  maxInvitees?: number;
};

export async function POST(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId") || "";
  if (!eventId)
    return NextResponse.json(
      { ok: false, error: "eventId required" },
      { status: 400 },
    );

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event)
    return NextResponse.json(
      { ok: false, error: "event not found" },
      { status: 404 },
    );

  const ct = (req.headers.get("content-type") || "").toLowerCase();
  let rows: Row[] = [];

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const csvText = form.get("csv");
      const jsonText = form.get("json");

      if (file && file instanceof File) {
        const name = file.name.toLowerCase();
        const buf = Buffer.from(await file.arrayBuffer());
        if (name.endsWith(".xlsx") || name.endsWith(".xls"))
          rows.push(...parseExcel(buf));
        else if (name.endsWith(".csv") || file.type.includes("csv"))
          rows.push(...parseCsv(buf.toString("utf8")));
        else {
          const fromX = parseExcel(buf);
          rows.push(...(fromX.length ? fromX : parseCsv(buf.toString("utf8"))));
        }
      }
      if (typeof csvText === "string" && csvText.trim())
        rows.push(...parseCsv(csvText));
      if (typeof jsonText === "string" && jsonText.trim()) {
        try {
          const js = JSON.parse(jsonText) as Row[];
          if (Array.isArray(js)) rows.push(...js);
        } catch {
          return NextResponse.json(
            { ok: false, error: "invalid json text" },
            { status: 400 },
          );
        }
      }
    } else if (ct.includes("text/csv")) {
      rows = parseCsv(await req.text());
    } else if (ct.includes("application/json")) {
      rows = (await req.json()) as Row[];
    } else {
      return NextResponse.json(
        { ok: false, error: "unsupported content-type" },
        { status: 415 },
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "parse_failed", reason: e?.message },
      { status: 400 },
    );
  }

  if (!rows.length)
    return NextResponse.json(
      { ok: false, error: "no rows parsed" },
      { status: 400 },
    );

  // Dedupe in-memory (E-Mail bevorzugt, sonst Phone)
  const deduped = dedupeRows(rows);

  const results: any[] = [];
  for (const r of deduped) {
    const email = norm(r.email);
    const phone = normPhone(r.phone);
    const firstName = norm(r.firstName);
    const lastName = norm(r.lastName);
    const maxInvitees = Number.isFinite(r.maxInvitees)
      ? Math.max(0, Number(r.maxInvitees))
      : 0;

    if (!email && !phone) {
      results.push({ ok: false, reason: "missing contact", row: r });
      continue;
    }

    // Guest upsert (findFirst, da primaryEmail nicht unique)
    let gp: any = null;
    if (email)
      gp = await prisma.guestProfile.findFirst({
        where: { primaryEmail: email },
      });
    if (!gp && phone)
      gp = await prisma.guestProfile.findFirst({ where: { phone } });

    if (gp) {
      gp = await prisma.guestProfile.update({
        where: { id: gp.id },
        data: {
          primaryEmail: email ?? gp.primaryEmail,
          phone: phone ?? gp.phone,
          firstName: firstName ?? gp.firstName,
          lastName: lastName ?? gp.lastName,
        },
      });
    } else {
      gp = await prisma.guestProfile.create({
        data: { primaryEmail: email, phone, firstName, lastName },
      });
    }

    // Schon vorhandene Invitation? → nicht duplizieren; maxInvitees ggf. anheben
    const existing = await prisma.invitation.findFirst({
      where: { eventId, guestProfileId: gp.id },
    });
    if (existing) {
      let changed = false;
      if ((existing.maxInvitees ?? 0) < maxInvitees) {
        await prisma.invitation.update({
          where: { id: existing.id },
          data: { maxInvitees },
        });
        changed = true;
      }
      results.push({
        ok: true,
        existing: true,
        guest: gp,
        invitation: {
          ...existing,
          maxInvitees: changed ? maxInvitees : existing.maxInvitees,
        },
        link: existing.shareCode ? buildInviteLink(existing.shareCode) : null,
      });
      continue;
    }

    // Neu
    const shareCode = makeShareCode(email || phone || crypto.randomUUID());
    const inv = await prisma.invitation.create({
      data: {
        eventId,
        guestProfileId: gp.id,
        status: "PENDING",
        shareCode,
        maxInvitees,
      },
    });

    results.push({
      ok: true,
      guest: gp,
      invitation: inv,
      link: buildInviteLink(shareCode),
    });
  }

  return NextResponse.json(
    { ok: true, count: results.length, results },
    { status: 200 },
  );
}

/* ---------- helpers ---------- */
function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.findIndex((h) => h === name);
  const getInt = (...names: string[]) => {
    for (const n of names) {
      const i = idx(n);
      if (i >= 0) return (cols: string[]) => toInt(cols[i]);
    }
    return (_: string[]) => undefined;
  };

  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const readMax = getInt("maxinvitees", "maxinvites", "max", "kontingent"); // <— hier ist „maxinvites“ neu
    out.push({
      email: val(cols[idx("email")]),
      phone: val(cols[idx("phone")]),
      firstName:
        val(cols[idx("firstname")]) ??
        val(cols[idx("first_name")]) ??
        val(cols[idx("vorname")]),
      lastName:
        val(cols[idx("lastname")]) ??
        val(cols[idx("last_name")]) ??
        val(cols[idx("nachname")]),
      maxInvitees: readMax(cols),
    });
  }
  return out;
}

function parseExcel(buf: Buffer): Row[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
    defval: "",
  });
  return json.map((r) => {
    const m = lowerKeys(r);
    return {
      email: norm(m.email),
      phone: normPhone(m.phone),
      firstName: norm(m.firstname) ?? norm(m.first_name) ?? norm(m.vorname),
      lastName: norm(m.lastname) ?? norm(m.last_name) ?? norm(m.nachname),
      // hier ebenfalls „maxinvites“
      maxInvitees: toInt(
        m.maxinvitees ?? m.maxinvites ?? m.max ?? m.kontingent,
      ),
    } as Row;
  });
}

function lowerKeys<T extends Record<string, any>>(obj: T) {
  const o: any = {};
  for (const k of Object.keys(obj)) o[k.toLowerCase()] = obj[k];
  return o;
}
function val(s: any) {
  if (s == null) return undefined;
  const v = String(s).trim();
  return v.length ? v : undefined;
}
function norm(s?: string | null) {
  if (!s) return undefined;
  const v = String(s).trim();
  return v.length ? v : undefined;
}
function normPhone(s?: string | null) {
  if (!s) return undefined;
  const d = String(s).replace(/[^\d+]/g, "");
  return d.length ? d : undefined;
}
function toInt(x: any) {
  const n = Number.parseInt(String(x ?? "").trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function dedupeRows(rows: Row[]): Row[] {
  const byEmail = new Map<string, Row>(),
    byPhone = new Map<string, Row>();
  const out: Row[] = [];
  for (const r of rows) {
    const email = (r.email || "").toLowerCase().trim();
    const phone = normPhone(r.phone);
    let ref: Row | undefined;
    if (email && byEmail.has(email)) ref = byEmail.get(email)!;
    else if (phone && byPhone.has(phone)) ref = byPhone.get(phone)!;
    if (ref) {
      ref.firstName = ref.firstName || r.firstName;
      ref.lastName = ref.lastName || r.lastName;
      ref.email = ref.email || r.email;
      ref.phone = ref.phone || r.phone;
      if (Number.isFinite(r.maxInvitees))
        ref.maxInvitees = Math.max(ref.maxInvitees ?? 0, Number(r.maxInvitees));
    } else {
      const copy: Row = {
        ...r,
        email: r.email?.trim(),
        phone: normPhone(r.phone),
        maxInvitees: Number.isFinite(r.maxInvitees)
          ? Math.max(0, Number(r.maxInvitees))
          : undefined,
      };
      out.push(copy);
      if (email) byEmail.set(email, copy);
      if (copy.phone) byPhone.set(copy.phone, copy);
    }
  }
  return out;
}

function makeShareCode(seed: string) {
  const hash = crypto
    .createHash("sha256")
    .update(seed + Date.now().toString())
    .digest("base64url");
  return hash.slice(0, 10).toUpperCase();
}
function buildInviteLink(shareCode: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/invite?code=${encodeURIComponent(shareCode)}`;
}
