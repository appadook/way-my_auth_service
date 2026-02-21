"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type TopNavProps = {
  className?: string;
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "Docs" },
  { href: "/login", label: "Auth" },
  { href: "/playground", label: "Playground" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/cors", label: "CORS" },
  { href: "/admin/sessions", label: "Sessions" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TopNav({ className }: TopNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`hud-panel flex items-center justify-between rounded-none px-5 py-3 ${className ?? ""}`.trim()}>
      <div className="flex items-center gap-3">
        <Image src="/way-asset-logo.png" alt="WAY Auth" width={28} height={28} className="h-7 w-7" />
        <span className="font-display text-sm tracking-widest text-[#9fdd58]/80">WAY Auth</span>
        <div className="status-dot ml-2" role="status" aria-label="Operational">
          <span className="sr-only">Operational</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {navLinks.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
                active
                  ? "border border-[#9fdd58]/25 bg-[#9fdd58]/8 text-[#9fdd58]"
                  : "text-slate-400 hover:text-[#9fdd58]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
