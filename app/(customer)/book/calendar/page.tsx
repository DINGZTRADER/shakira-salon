"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Calendar as CalIcon, ChevronRight, Sparkles, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SlotPicker } from "@/components/shared/SlotPicker";
import { formatUGX, formatDate, formatTime, cn } from "@/lib/utils";
import type { Service } from "@/lib/types";

function CalendarStep() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selections
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  // Load active services
  useEffect(() => {
    (async () => {
      const { data, error: svcErr } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (svcErr) {
        setError("Unable to load salon services. Please try again.");
      } else {
        setServices((data ?? []) as Service[]);
      }
      setLoading(false);
    })();
  }, [supabase]);

  // Pre-select service from URL param
  useEffect(() => {
    const preset = searchParams.get("service");
    if (preset) setSelectedServiceId(preset);
  }, [searchParams]);

  const mainServices = services.filter(s => !s.is_add_on);
  const addOns = services.filter(s => s.is_add_on);
  const selectedService = services.find(s => s.id === selectedServiceId);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (!selectedServiceId || !date || !time) return;

    // Calculate sum
    const mainPrice = selectedService?.base_price_ugx ?? selectedService?.price ?? 0;
    const addOnPrice = addOns
      .filter(a => selectedAddOns.includes(a.id))
      .reduce((sum, a) => sum + (a.base_price_ugx ?? a.price ?? 0), 0);

    const total = mainPrice + addOnPrice;
    const deposit = selectedService?.deposit_price_ugx ?? 0;

    const query = new URLSearchParams({
      serviceId: selectedServiceId,
      addOns: selectedAddOns.join(","),
      date,
      time,
      total: total.toString(),
      deposit: deposit.toString(),
    });

    router.push(`/book/stylist?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-ink-light">
        <div className="animate-pulse text-lg font-medium">Loading salon calendar and services…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Booking Header Progress */}
      <div className="mb-8 flex items-center justify-between text-xs font-semibold tracking-wider text-ink-light uppercase">
        <span className="text-brand-600 border-b-2 border-brand-500 pb-1">1. Date & Service</span>
        <ChevronRight className="h-4 w-4" />
        <span>2. Select Stylist</span>
        <ChevronRight className="h-4 w-4" />
        <span>3. Checkout</span>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Select Service & Date</h1>
        <p className="mt-2 text-ink-light">Choose your main treatment, customize with optional add-ons, and secure your time slot.</p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Form Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Main Services */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-500" /> Choose Service
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {mainServices.map((s) => {
                const selected = s.id === selectedServiceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(s.id);
                      setSelectedAddOns([]);
                    }}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-brand-500 bg-brand-50/70 shadow-sm ring-1 ring-brand-500"
                        : "border-brand-100 hover:border-brand-300 bg-white"
                    )}
                  >
                    <div>
                      <span className="block font-semibold text-ink">{s.name}</span>
                      <span className="mt-1 block text-xs text-ink-light line-clamp-2">{s.description}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between w-full">
                      <span className="text-xs font-medium text-ink-light">{s.duration_minutes} mins</span>
                      <span className="font-bold text-brand-700">{formatUGX(s.base_price_ugx ?? s.price ?? 0)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Add-ons */}
          {selectedServiceId && addOns.length > 0 && (
            <section className="animate-fadeIn">
              <h2 className="text-lg font-bold text-ink mb-3">Optional Add-ons</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {addOns.map((a) => {
                  const selected = selectedAddOns.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAddOn(a.id)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
                        selected
                          ? "border-brand-500 bg-brand-50"
                          : "border-brand-100 bg-white hover:border-brand-300"
                      )}
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-ink truncate">{a.name}</span>
                        <span className="block text-[10px] text-ink-light">{a.duration_minutes} mins</span>
                      </div>
                      <span className="text-xs font-bold text-brand-600 ml-2">
                        +{formatUGX(a.base_price_ugx ?? a.price ?? 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Date & Time Slotpicker */}
          <section>
            <h2 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
              <CalIcon className="h-5 w-5 text-brand-500" /> Select Date & Time
            </h2>
            <Card>
              <CardBody className="p-0">
                <SlotPicker
                  staffId={null} // staff will be picked in next step
                  date={date}
                  time={time}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                />
              </CardBody>
            </Card>
          </section>
        </div>

        {/* Right Column: Sticky Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card className="border-brand-100 bg-brand-50/30">
              <CardBody className="p-6">
                <h3 className="text-lg font-bold text-ink mb-4">Booking Summary</h3>
                
                {selectedService ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-medium text-ink-light uppercase">Main Treatment</span>
                      <div className="mt-1 flex items-start justify-between font-semibold text-ink">
                        <span>{selectedService.name}</span>
                        <span>{formatUGX(selectedService.base_price_ugx ?? selectedService.price ?? 0)}</span>
                      </div>
                    </div>

                    {selectedAddOns.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-ink-light uppercase">Add-ons</span>
                        <ul className="mt-1.5 space-y-1">
                          {addOns
                            .filter(a => selectedAddOns.includes(a.id))
                            .map(a => (
                              <li key={a.id} className="flex justify-between text-sm text-ink-light">
                                <span>+ {a.name}</span>
                                <span>{formatUGX(a.base_price_ugx ?? a.price ?? 0)}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    <hr className="border-brand-100" />

                    <div className="flex justify-between font-bold text-ink">
                      <span>Total Quote</span>
                      <span className="text-lg text-brand-700">
                        {formatUGX(
                          (selectedService.base_price_ugx ?? selectedService.price ?? 0) +
                          addOns
                            .filter(a => selectedAddOns.includes(a.id))
                            .reduce((sum, a) => sum + (a.base_price_ugx ?? a.price ?? 0), 0)
                        )}
                      </span>
                    </div>

                    {(selectedService.deposit_price_ugx ?? 0) > 0 && (
                      <div className="rounded-lg bg-white border border-brand-100 p-3 text-xs text-brand-800 flex justify-between">
                        <span>Deposit due today:</span>
                        <strong className="text-brand-900">{formatUGX(selectedService.deposit_price_ugx ?? 0)}</strong>
                      </div>
                    )}

                    {date && time && (
                      <div className="rounded-lg bg-green-50/70 border border-green-100 p-3 text-xs text-green-800">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Clock className="h-4 w-4 text-green-600 animate-pulse" />
                          <span>Temporary 10-Minute Hold Enabled</span>
                        </div>
                        <p className="mt-1 text-green-700">Your slot for {formatDate(date)} at {formatTime(time)} will be locked once you choose a stylist.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-ink-light italic">Select a service to view pricing details.</p>
                )}

                <Button
                  className="mt-6"
                  fullWidth
                  size="lg"
                  disabled={!selectedServiceId || !date || !time}
                  onClick={handleNext}
                >
                  Choose Stylist <ChevronRight className="h-4 w-4" />
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookCalendarPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-light">Loading Step…</div>}>
      <CalendarStep />
    </Suspense>
  );
}
