import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Planner",
  description: "Webova aplikacia na spravu uloh, projektov, kalendara a timovych kapacit."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
