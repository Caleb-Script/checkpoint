import ErrorView from '../components/ErrorView';

export default function NotFoundPage() {
  return (
    <ErrorView
      title="Seite nicht gefunden"
      message="Die angeforderte Seite existiert nicht oder wurde verschoben."
      actions={[
        { href: '/', label: 'Zur Startseite', variant: 'contained' },
        { href: '/dashboard', label: 'Zum Dashboard', variant: 'outlined' },
      ]}
    />
  );
}
