import type { Metadata } from "next";
import { Suspense } from "react";
import { ScrollPositionRestorer } from "@/components/scroll-position-restorer";
import "./globals.css";

export const metadata: Metadata = {
  title: "KABI Zeiterfassung",
  description: "Interne Zeiterfassung für KABI Consulting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <Suspense fallback={null}>
          <ScrollPositionRestorer />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
