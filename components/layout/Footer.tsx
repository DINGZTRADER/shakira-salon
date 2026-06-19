import Link from "next/link";
import { MapPin, Phone, Instagram, Clock } from "lucide-react";
import { SALON } from "@/lib/constants";
import { formatWhatsAppNumber } from "@/lib/utils";

export function Footer() {
  const year = new Date().getFullYear();
  const whatsapp = formatWhatsAppNumber(SALON.whatsapp);

  return (
    <footer className="mt-16 border-t border-brand-100 bg-brand-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-brand-700">{SALON.name}</h3>
            <p className="mt-2 text-sm text-ink-light">
              Your trusted beauty &amp; hair salon in Kampala. Appointments only.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-ink">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-light">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <span>{SALON.location}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-brand-500" />
                <a href={`tel:${SALON.phone}`} className="hover:text-brand-600">
                  {SALON.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="h-4 w-4 shrink-0 text-brand-500" />
                <a
                  href={`https://instagram.com/${SALON.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-600"
                >
                  @{SALON.instagram}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-sm font-semibold text-ink">Business Hours</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-light">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-brand-500" />
                <span>Mon – Sat: 8:00 AM – 8:00 PM</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-brand-500" />
                <span>Sunday: 10:00 AM – 5:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-ink">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/services" className="text-ink-light hover:text-brand-600">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/book" className="text-ink-light hover:text-brand-600">
                  Book Appointment
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-light hover:text-brand-600"
                >
                  WhatsApp Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-brand-100 pt-6 text-center text-xs text-ink-light">
          © {year} {SALON.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
