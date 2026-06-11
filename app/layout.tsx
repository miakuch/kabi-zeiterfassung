import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KABI Zeiterfassung",
  description: "Interne Zeiterfassung fuer KABI Consulting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
