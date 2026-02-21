import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "WAY Auth Service",
    template: "%s | WAY Auth Service",
  },
  description:
    "Standalone authentication service for email/password auth, JWT access tokens, refresh token rotation, and JWKS publishing.",
  keywords: [
    "WAY Auth",
    "authentication service",
    "JWT",
    "refresh token rotation",
    "JWKS",
    "Next.js auth API",
  ],
  icons: {
    icon: "/way-asset-logo.png",
    shortcut: "/way-asset-logo.png",
    apple: "/way-asset-logo.png",
  },
  openGraph: {
    title: "WAY Auth Service",
    description:
      "Secure, simple, standalone JWT auth service for modern frontends and backends.",
    images: ["/way-asset-marketing-2.png"],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
