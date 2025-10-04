import type { Metadata } from "next";
import "../styles/design-system.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAP GRC Platform",
  description: "Governance, Risk, and Compliance platform for SAP environments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
