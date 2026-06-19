"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Scissors,
  Users,
  CalendarDays,
  Menu,
  X,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/services", label: "Services", icon: Scissors },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/social", label: "Social Inbox", icon: MessageCircle },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut, profile } = useAuthContext();
  const [open, setOpen] = useState(false);

  const NavItems = () => (
    <nav className="flex flex-col gap-1">
      {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-500 text-white"
                : "text-brand-100 hover:bg-ink-light"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-ink-light bg-ink px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-bold text-white">
          Sakira Admin
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          className="rounded-lg p-1 text-white hover:bg-ink-light"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-ink p-4 lg:flex">
        <Link href="/admin" className="mb-6 px-3 text-xl font-bold text-white">
          Sakira Admin
        </Link>
        <NavItems />
        <div className="mt-auto space-y-2 pt-6">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 text-xs text-brand-100 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View site
          </Link>
          <p className="px-3 text-xs text-brand-200">{profile?.full_name}</p>
          <button
            onClick={() => signOut()}
            className="w-full rounded-lg bg-ink-light px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-ink p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xl font-bold text-white">Sakira Admin</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1 text-white hover:bg-ink-light"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <NavItems />
            <div className="mt-auto space-y-2 pt-6">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 text-xs text-brand-100"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View site
              </Link>
              <button
                onClick={() => signOut()}
                className="w-full rounded-lg bg-ink-light px-3 py-2 text-sm font-medium text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
