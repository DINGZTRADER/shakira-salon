import Link from "next/link";
import { Sparkles, CalendarCheck, ShieldCheck, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { SALON } from "@/lib/constants";
import type { Service } from "@/lib/types";

export const revalidate = 60; // ISR: refresh service data every minute

export default async function HomePage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true })
    .limit(4);

  const featured = (services ?? []) as Service[];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
              <MapPin className="h-3.5 w-3.5" />
              {SALON.location}
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Look and feel your best at{" "}
              <span className="text-brand-600">Sakira</span>
            </h1>
            <p className="mt-4 text-lg text-ink-light">
              Professional hair, nails, skincare and makeup services in the heart
              of Kampala. Book your appointment online in seconds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-600"
              >
                <CalendarCheck className="h-5 w-5" />
                Book an Appointment
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center rounded-lg border border-brand-500 px-6 py-3 text-base font-medium text-brand-600 transition-colors hover:bg-brand-50"
              >
                View Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <Feature
            icon={<Sparkles className="h-6 w-6 text-brand-500" />}
            title="Expert Stylists"
            desc="Skilled professionals dedicated to beautiful, lasting results."
          />
          <Feature
            icon={<CalendarCheck className="h-6 w-6 text-brand-500" />}
            title="Easy Online Booking"
            desc="Choose your service, time and stylist — confirmed via WhatsApp."
          />
          <Feature
            icon={<ShieldCheck className="h-6 w-6 text-brand-500" />}
            title="Appointments Only"
            desc="No waiting in line. Your slot is reserved just for you."
          />
        </div>
      </section>

      {/* Featured services */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink">Popular Services</h2>
            <p className="mt-1 text-sm text-ink-light">
              A selection of what we offer
            </p>
          </div>
          <Link
            href="/services"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all →
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-light">
            Services will appear here soon.
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl bg-ink px-6 py-10 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready for your next appointment?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Book online today and let our team take care of the rest.
          </p>
          <Link
            href="/book"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-600"
          >
            <CalendarCheck className="h-5 w-5" />
            Book Now
          </Link>
        </div>
      </section>
    </>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-light">{desc}</p>
    </div>
  );
}
