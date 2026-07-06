import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Stels CRM",
  description: "Производственная CRM — широкоформатная печать",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
        <Nav />
        {children}
      </body>
    </html>
  );
}
