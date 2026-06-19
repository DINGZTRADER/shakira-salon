"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, CheckCircle2, ChevronRight, Smartphone, AlertCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatUGX, formatDate, formatTime, cn } from "@/lib/utils";

function CheckoutStep() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceId = searchParams.get("serviceId") || "";
  const addOns = searchParams.get("addOns") || "";
  const date = searchParams.get("date") || "";
  const time = searchParams.get("time") || "";
  const total = Number(searchParams.get("total") || "0");
  const deposit = Number(searchParams.get("deposit") || "0");
  const stylistId = searchParams.get("stylistId") || "";
  const holdId = searchParams.get("holdId") || "";

  const [paymentMethod, setPaymentMethod] = useState<"mtn_mobile_money" | "airtel_money" | "cash_at_salon">("mtn_mobile_money");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState("");

  // Load user data to pre-fill phone number
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("users").select("phone").eq("id", user.id).single();
        if (profile?.phone) {
          setPhoneNumber(profile.phone);
        }
      }
    })();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data: authUser } = await supabase.auth.getUser();
    const { data: fallbackProfile } = await supabase.from("users").select("id").limit(1).single();
    const customerId = authUser?.user?.id || fallbackProfile?.id;

    if (!customerId) {
      setError("Please sign in to complete booking.");
      setSubmitting(false);
      return;
    }

    const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
    if (!branch) {
      setError("Active salon branch not found.");
      setSubmitting(false);
      return;
    }

    // 1. Create Appointment
    const startsAt = new Date(`${date}T${time}:00`);
    const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000);

    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .insert({
        customer_id: customerId,
        stylist_id: stylistId,
        branch_id: branch.id,
        hold_id: holdId || null,
        status: paymentMethod === "cash_at_salon" ? "confirmed" : "pending",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        subtotal_ugx: total - deposit,
        deposit_due_ugx: deposit,
        total_ugx: total,
      })
      .select()
      .single();

    if (apptErr || !appt) {
      setError("Could not confirm slot. It may have expired. Please start again.");
      setSubmitting(false);
      return;
    }

    setCreatedAppointmentId(appt.id);

    // 2. If mobile money, create payment and trigger api webhook simulation
    if (paymentMethod !== "cash_at_salon") {
      const providerRef = "TXN-" + Math.floor(1000000 + Math.random() * 9000000);
      
      const { error: payErr } = await supabase.from("payments").insert({
        appointment_id: appt.id,
        customer_id: customerId,
        provider: paymentMethod,
        status: "pending",
        amount_ugx: deposit,
        phone_e164: phoneNumber || "+256700123456",
        provider_reference: providerRef,
      });

      if (payErr) {
        setError("Booking created, but deposit transaction failed. Contact salon on WhatsApp.");
        setSubmitting(false);
        return;
      }

      // Simulate Actual MoMo API callback trigger after 3 seconds
      setTimeout(async () => {
        try {
          await fetch("/api/webhooks/momo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: providerRef,
              status: "SUCCESSFUL",
              amount: deposit,
            }),
          });
        } catch (e) {
          console.error("Simulation callback failed:", e);
        }
      }, 3000);
    }

    // Release hold
    if (holdId) {
      await supabase.from("booking_holds").update({ status: "converted" }).eq("id", holdId);
    }

    setSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="border-green-100 bg-white shadow-xl">
          <CardBody className="text-center p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 animate-bounce" />
            <h1 className="mt-6 text-2xl font-bold text-ink">Appointment Requested!</h1>
            <p className="mt-3 text-sm text-ink-light">
              Your appointment is successfully scheduled.
            </p>
            {paymentMethod !== "cash_at_salon" && (
              <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-xs text-yellow-800 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-yellow-600" />
                <span>Simulating Mobile Money network callback... Confirming deposit...</span>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push("/my-bookings")} variant="primary">
                View My Bookings
              </Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Return Home
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Booking Header Progress */}
      <div className="mb-8 flex items-center justify-between text-xs font-semibold tracking-wider text-ink-light uppercase">
        <span>1. Date & Service</span>
        <ChevronRight className="h-4 w-4" />
        <span>2. Select Stylist</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-brand-600 border-b-2 border-brand-500 pb-1">3. Checkout</span>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Checkout & Confirm</h1>
        <p className="mt-2 text-ink-light">Review your order details and choose your payment method.</p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
        {/* Left Columns: Payment selector */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="p-6">
              <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-500" /> Choose Payment Option
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mtn_mobile_money")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center transition-all bg-white",
                    paymentMethod === "mtn_mobile_money"
                      ? "border-yellow-400 bg-yellow-50 shadow-sm ring-1 ring-yellow-400"
                      : "border-brand-100 hover:border-brand-300"
                  )}
                >
                  <Smartphone className="h-6 w-6 text-yellow-600" />
                  <div>
                    <span className="block font-semibold text-ink text-sm">MTN MoMo</span>
                    <span className="text-[10px] text-ink-light">Instant Deposit</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("airtel_money")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center transition-all bg-white",
                    paymentMethod === "airtel_money"
                      ? "border-red-400 bg-red-50 shadow-sm ring-1 ring-red-400"
                      : "border-brand-100 hover:border-brand-300"
                  )}
                >
                  <Smartphone className="h-6 w-6 text-red-600" />
                  <div>
                    <span className="block font-semibold text-ink text-sm">Airtel Money</span>
                    <span className="text-[10px] text-ink-light">Instant Deposit</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash_at_salon")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center transition-all bg-white",
                    paymentMethod === "cash_at_salon"
                      ? "border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-500"
                      : "border-brand-100 hover:border-brand-300"
                  )}
                >
                  <CreditCard className="h-6 w-6 text-brand-600" />
                  <div>
                    <span className="block font-semibold text-ink text-sm">Pay at Salon</span>
                    <span className="text-[10px] text-ink-light">No Deposit Needed</span>
                  </div>
                </button>
              </div>

              {paymentMethod !== "cash_at_salon" && (
                <div className="mt-6 space-y-4 border-t border-brand-50 pt-6 animate-fadeIn">
                  <Input
                    label="Mobile Money Phone Number"
                    placeholder="+256700123456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p>After clicking Book, we will trigger a mobile money deposit prompt of {formatUGX(deposit)} on your mobile. Your appointment is confirmed automatically once you complete the prompt.</p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Sticky Summary */}
        <div className="lg:col-span-1">
          <Card className="border-brand-100 bg-brand-50/20">
            <CardBody className="p-6">
              <h3 className="text-lg font-bold text-ink mb-4">Visit Overview</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-light">Date</span>
                  <span className="font-semibold text-ink">{formatDate(date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-light">Time</span>
                  <span className="font-semibold text-ink">{formatTime(time)}</span>
                </div>

                <hr className="border-brand-100" />

                <div className="flex justify-between">
                  <span className="text-ink-light">Appointment Total</span>
                  <span className="font-semibold text-ink">{formatUGX(total)}</span>
                </div>
                
                {paymentMethod !== "cash_at_salon" ? (
                  <>
                    <div className="flex justify-between text-brand-700 font-semibold">
                      <span>Deposit Due Today</span>
                      <span>{formatUGX(deposit)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-ink-light pl-2">
                      <span>Remaining balance at salon</span>
                      <span>{formatUGX(total - deposit)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-brand-700 font-semibold">
                    <span>Due Today</span>
                    <span>{formatUGX(0)}</span>
                  </div>
                )}

                <Button
                  className="mt-6"
                  fullWidth
                  size="lg"
                  type="submit"
                  loading={submitting}
                >
                  Pay & Confirm Booking
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </form>
    </div>
  );
}

export default function BookCheckoutPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-light">Loading Step…</div>}>
      <CheckoutStep />
    </Suspense>
  );
}
