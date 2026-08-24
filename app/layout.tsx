import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketerOS · Marketing operating system",
  description: "One workspace for your entire marketing operation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
