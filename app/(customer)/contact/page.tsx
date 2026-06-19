import type { Metadata } from "next";
import { MapPin, Phone, Instagram, Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { SALON } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${SALON.name} in Kampala — call, WhatsApp or visit us. View our business hours and location.`,
};

export default function ContactPage() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    SALON.location
  )}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">Contact Us</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-light">
          We&apos;d love to hear from you. Reach out or visit us in Kampala.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {/* Location */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <MapPin className="h-5 w-5 text-brand-500" />
              </span>
              <h2 className="font-semibold text-ink">Location</h2>
            </div>
            <p className="mt-3 text-sm text-ink-light">{SALON.location}</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Open in Google Maps →
            </a>
          </CardBody>
        </Card>

        {/* Phone */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Phone className="h-5 w-5 text-brand-500" />
              </span>
              <h2 className="font-semibold text-ink">Phone</h2>
            </div>
            <a
              href={`tel:${SALON.phone}`}
              className="mt-3 inline-block text-sm text-ink-light hover:text-brand-600"
            >
              {SALON.phone}
            </a>
          </CardBody>
        </Card>

        {/* Instagram */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Instagram className="h-5 w-5 text-brand-500" />
              </span>
              <h2 className="font-semibold text-ink">Instagram</h2>
            </div>
            <a
              href={`https://instagram.com/${SALON.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-ink-light hover:text-brand-600"
            >
              @{SALON.instagram}
            </a>
          </CardBody>
        </Card>

        {/* Hours */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Clock className="h-5 w-5 text-brand-500" />
              </span>
              <h2 className="font-semibold text-ink">Business Hours</h2>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-ink-light">
              <li>Monday – Saturday: 8:00 AM – 8:00 PM</li>
              <li>Sunday: 10:00 AM – 5:00 PM</li>
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* WhatsApp CTA */}
      <div className="mt-10 rounded-2xl bg-brand-50 p-8 text-center">
        <h2 className="text-xl font-semibold text-ink">
          Have a question? Message us directly
        </h2>
        <p className="mt-2 text-sm text-ink-light">
          We respond fastest on WhatsApp.
        </p>
        <div className="mt-5 flex justify-center">
          <WhatsAppButton
            variant="inline"
            message="Hello Sakira, I have a question about your services."
          />
        </div>
      </div>
    </div>
  );
}
