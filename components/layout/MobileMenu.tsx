"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
}

export function MobileMenu({
  open,
  onClose,
  isAuthenticated,
  isAdmin,
  onSignOut,
}: MobileMenuProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-72 max-w-[80%] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-brand-100 p-4">
          <span className="font-semibold text-brand-700">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1 text-ink hover:bg-brand-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex flex-col p-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "rounded-lg px-3 py-3 text-base font-medium transition-colors",
                pathname === link.href
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink hover:bg-brand-50"
              )}
            >
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="rounded-lg px-3 py-3 text-base font-medium text-brand-700 hover:bg-brand-50"
            >
              Admin Dashboard
            </Link>
          )}

          <div className="mt-4 border-t border-brand-100 pt-4">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="w-full rounded-lg bg-ink px-3 py-3 text-center text-base font-medium text-white"
              >
                Sign Out
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={onClose}
                  className="rounded-lg border border-brand-500 px-3 py-3 text-center text-base font-medium text-brand-600"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={onClose}
                  className="rounded-lg bg-brand-500 px-3 py-3 text-center text-base font-medium text-white"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
