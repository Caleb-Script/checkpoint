// /Users/gentlebookpro/Projekte/checkpoint/web/src/app/dashboard/page.tsx
import * as React from "react";
import { redirect } from "next/navigation";

async function getSession() {
  // Server ruft eigene API auf; Cookies werden serverseitig automatisch mitgeschickt,
  // weil gleicher Origin. Falls nicht, siehe api/session.
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/session`, {
    cache: "no-store",
  });
  if (!res.ok) return { authenticated: false } as const;
  return res.json();
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.authenticated) redirect("/login");

  return (
    <main style={{ padding: 24 }}>
      <h1>Willkommen 👋</h1>
      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
        {JSON.stringify(session.profile, null, 2)}
      </pre>
    </main>
  );
}
