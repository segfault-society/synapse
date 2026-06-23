"use client";

import Link from "next/link";
import { PersonaSwitcher } from "@/components/synapse/persona-switcher";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/me", label: "Me" },
  { href: "/admin", label: "Admin" },
  { href: "/demo", label: "Demo" },
];

export function SynapseHeader() {
  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border/20 bg-background/80 backdrop-blur-sm max-w-7xl mx-auto">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Wordmark: SYN·A·PSE with middle "A" in text-primary */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className="font-bold text-2xl tracking-widest">
              SYN<span className="text-primary">A</span>PSE
            </span>
          </Link>

          {/* Nav links + persona switcher */}
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-4">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <PersonaSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
