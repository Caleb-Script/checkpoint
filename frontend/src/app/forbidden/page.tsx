import ErrorView from '@/components/ErrorView';
import * as jose from 'jose';
import { cookies } from 'next/headers';

function getCookieName() {
  return process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME ?? 'kc_access_token';
}

export default async function ForbiddenPage() {
  const store = await cookies();
  const token = store.get(getCookieName())?.value;

  let displayName = 'Nutzer';
  let roles: string[] = [];

  if (token) {
    try {
      const payload = jose.decodeJwt(token) as {
        name?: string;
        preferred_username?: string;
        email?: string;
        realm_access?: { roles?: string[] };
      };
      displayName =
        payload?.name ??
        payload?.preferred_username ??
        payload?.email ??
        'Nutzer';
      roles = payload?.realm_access?.roles ?? [];
    } catch {
      // ignore decode errors, Middleware validiert ohnehin
    }
  }

  return (
    <ErrorView
      title="Zugriff verweigert"
      message={
        <>
          Hi <strong>{displayName}</strong>, du bist angemeldet, hast aber keine
          Berechtigung, diese Seite zu sehen.
        </>
      }
      chips={roles}
      actions={[
        { href: '/', label: 'Zur Startseite', variant: 'contained' },
        { href: '/dashboard', label: 'Zum Dashboard', variant: 'outlined' },
      ]}
    />
  );
}
