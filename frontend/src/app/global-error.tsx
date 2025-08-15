'use client';
import ErrorView from '@/components/ErrorView';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  // Optional: error.digest für Logs anzeigen
  return (
    <html>
      <body>
        <ErrorView
          title="Unerwarteter Fehler"
          message="Entschuldige, etwas ist schiefgelaufen. Bitte versuche es später erneut."
          actions={[
            { href: '/', label: 'Zur Startseite', variant: 'contained' },
          ]}
        />
      </body>
    </html>
  );
}
