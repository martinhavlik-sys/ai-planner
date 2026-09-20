import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Planner",
  description: "Pracovná aplikácia na správu úloh, oddelení, entít, klientov, používateľov a kalendára."
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
