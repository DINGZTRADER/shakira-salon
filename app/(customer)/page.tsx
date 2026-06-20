import Link from "next/link";
import { Sparkles, CalendarCheck, ShieldCheck, MapPin, Play, MessageCircle } from "lucide-react";
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
      {/* Immersive Video Hero Section */}
      <section className="relative h-[80vh] w-full overflow-hidden bg-black text-white flex items-center">
        {/* Background Video */}
        <video
          src="/shakira_intro.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 w-full z-10">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 backdrop-blur-md border border-brand-500/30 px-3 py-1 text-xs font-semibold text-brand-300">
              <MapPin className="h-3.5 w-3.5" />
              {SALON.location}
            </span>
            
            <div className="flex items-center gap-4 animate-fadeIn">
              <img
                src="/shakira.png"
                alt="Shakira portrait"
                className="h-16 w-16 rounded-full object-cover border-2 border-brand-500 shadow-lg"
              />
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-brand-400 uppercase">Welcome to</h2>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
                  Shakira <span className="text-brand-400">Beauty</span>
                </h1>
              </div>
            </div>

            <p className="text-lg text-brand-100/90 leading-relaxed font-medium max-w-lg">
              Experience Kampala's premium hair treatments, dreadlocks, perm shaping, and makeup artistry. Secure your appointment holds instantly.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-base font-bold text-white transition-all hover:bg-brand-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand-500/25"
              >
                <CalendarCheck className="h-5 w-5" />
                Book Appointment
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3.5 text-base font-bold text-white transition-all hover:bg-white/20"
              >
                View Services Menu
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Feature Cards */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          <Feature
            icon={<Sparkles className="h-6 w-6 text-brand-500" />}
            title="Expert Stylists"
            desc="Certified specialists dedicated to beautiful, custom, and long-lasting hair creations."
          />
          <Feature
            icon={<CalendarCheck className="h-6 w-6 text-brand-500" />}
            title="In-App Hold Reservation"
            desc="Locks your slot for 10 minutes while verifying Mobile Money deposits."
          />
          <Feature
            icon={<ShieldCheck className="h-6 w-6 text-brand-500" />}
            title="Uganda-Centric Payments"
            desc="Pay deposits securely through MTN Mobile Money, Airtel Money, or cash at salon."
          />
        </div>
      </section>

      {/* Immersive Video Promo Section */}
      <section className="bg-brand-50/50 py-16">
        <div className="mx-auto max-w-6xl px-4 grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">Watch Our Stylists in Action</h2>
            <p className="text-base text-ink-light leading-relaxed">
              We design braids, locks, and color gradients tailored to bring out your natural shine. Watch our walkthrough to see client transformations and salon vibes.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <Play className="h-5 w-5 fill-brand-600" />
              </div>
              <span className="text-sm font-semibold text-ink">Explore hair dye & perm sets</span>
            </div>
          </div>
          
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-brand-100 bg-black">
            <video
              src="/shakira_promo.mp4"
              controls
              poster="/shakira.png"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Video & Media Gallery Section */}
      <section className="bg-white py-16 border-t border-brand-100">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold tracking-wider text-brand-600 uppercase bg-brand-50 px-3 py-1 rounded-full">
              Salon Spotlight
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-ink tracking-tight sm:text-4xl">
              Experience the Salon Vibes
            </h2>
            <p className="mt-4 text-base text-ink-light">
              Get a sneak peek into the creativity, laughter, and high-energy atmosphere at Sakira Beauty & Wellness.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Gallery Item 1 */}
            <div className="group relative rounded-2xl overflow-hidden shadow-md border border-brand-100 bg-black aspect-[4/5] flex flex-col justify-end">
              <video
                src="/welcoming_3.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              <div className="relative p-6 z-10 text-white">
                <span className="text-[10px] font-bold tracking-wider uppercase text-brand-400">Walkthrough</span>
                <h3 className="text-lg font-bold mt-1">Premium Styling Consultation</h3>
                <p className="text-xs text-brand-200 mt-1 leading-relaxed">Watch our step-by-step hair preparation and design consultation.</p>
              </div>
            </div>

            {/* Gallery Item 2 */}
            <div className="group relative rounded-2xl overflow-hidden shadow-md border border-brand-100 bg-black aspect-[4/5] flex flex-col justify-end">
              <video
                src="/shakira_appointment_demo.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              <div className="relative p-6 z-10 text-white">
                <span className="text-[10px] font-bold tracking-wider uppercase text-brand-400">In Action</span>
                <h3 className="text-lg font-bold mt-1">Braids & Locs Maintenance</h3>
                <p className="text-xs text-brand-200 mt-1 leading-relaxed">Witness the precision and care that goes into every lock and strand.</p>
              </div>
            </div>

            {/* Gallery Item 3 */}
            <div className="group relative rounded-2xl overflow-hidden shadow-md border border-brand-100 bg-black aspect-[4/5] flex flex-col justify-end">
              <video
                src="/dance_demo.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              <div className="relative p-6 z-10 text-white">
                <span className="text-[10px] font-bold tracking-wider uppercase text-brand-400">Celebration</span>
                <h3 className="text-lg font-bold mt-1">Celebrating Bold New Looks</h3>
                <p className="text-xs text-brand-200 mt-1 leading-relaxed">Feel the joy of client transformations and confidence boost.</p>
              </div>
            </div>

            {/* Gallery Item 4 */}
            <div className="group relative rounded-2xl overflow-hidden shadow-md border border-brand-100 bg-black aspect-video sm:col-span-2 flex flex-col justify-end">
              <video
                src="/shakira_podcast.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              <div className="relative p-6 z-10 text-white">
                <span className="text-[10px] font-bold tracking-wider uppercase text-brand-400">Spotlight Podcast</span>
                <h3 className="text-xl font-bold mt-1">Behind the Magic with Shakira</h3>
                <p className="text-xs text-brand-200 mt-1 leading-relaxed">Shakira shares her journey, styling secrets, and beauty philosophy.</p>
              </div>
            </div>

            {/* Gallery Item 5 */}
            <div className="group relative rounded-2xl overflow-hidden shadow-md border border-brand-100 bg-black aspect-video flex flex-col justify-end">
              <img
                src="/behind_the_scenes.jpeg"
                alt="Behind the scenes at salon"
                className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              <div className="relative p-6 z-10 text-white">
                <span className="text-[10px] font-bold tracking-wider uppercase text-brand-400">Snapshots</span>
                <h3 className="text-lg font-bold mt-1">Behind-the-scenes Moments</h3>
                <p className="text-xs text-brand-200 mt-1 leading-relaxed">Candid moments of our experts perfecting client looks.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular services list */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink">Popular Services</h2>
            <p className="mt-1 text-sm text-ink-light">
              Premium salon treatments priced in Ugandan Shillings (UGX).
            </p>
          </div>
          <Link
            href="/services"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View all services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-fadeIn">
            {featured.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-light italic">
            Services will appear here soon.
          </p>
        )}
      </section>
    </>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
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
    <div className="rounded-2xl border border-brand-100/50 bg-white p-8 text-center transition-all hover:shadow-md hover:border-brand-200">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50/70 text-brand-600">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2.5 text-sm text-ink-light leading-relaxed">{desc}</p>
    </div>
  );
}
