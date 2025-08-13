// /src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import "./globals.css"; // falls benötigt
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: "Checkpoint – Gäste & QR",
  description: "Mobile-first Gästeverwaltung mit QR-Codes.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A84FF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
      </body>
    </html>
  );
}
