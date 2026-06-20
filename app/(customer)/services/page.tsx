import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ServiceCard } from "@/components/shared/ServiceCard";
import type { Service } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Services",
  description:
    "Browse hair braiding, treatments, coloring, manicures, pedicures, facials and makeup services at Shakira Beauty & Hair Salon, Kampala.",
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  const services = (data ?? []) as Service[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">Our Services</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-light">
          Quality beauty and hair care, all prices in Ugandan Shillings.
        </p>
      </header>

      {error ? (
        <p className="mt-10 text-center text-red-600">
          Could not load services. Please try again later.
        </p>
      ) : services.length === 0 ? (
        <p className="mt-10 text-center text-ink-light">
          No services available right now.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
