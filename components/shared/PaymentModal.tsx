"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatUGX, cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  amount: number;
  defaultPhone?: string;
  onSuccess: () => void;
}

const methodStyles: Record<PaymentMethod, string> = {
  mtn_momo: "border-yellow-400 bg-yellow-50",
  airtel_money: "border-red-400 bg-red-50",
};

export function PaymentModal({
  open,
  onClose,
  appointmentId,
  amount,
  defaultPhone = "",
  onSuccess,
}: PaymentModalProps) {
  const supabase = createClient();
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [phone, setPhone] = useState(defaultPhone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePhone = (v: string) => /^\+?[0-9]{9,15}$/.test(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!method) return setError("Please select a payment method.");
    if (!validatePhone(phone))
      return setError("Enter a valid mobile money number.");

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Map method values
    const provider = method === "mtn_momo" ? "mtn_mobile_money" : "airtel_money";

    const { error: dbError } = await supabase.from("payments").insert({
      appointment_id: appointmentId,
      customer_id: user?.id || appointmentId, // fallback
      amount_ugx: amount,
      provider,
      status: "pending",
      phone_e164: phone,
      provider_reference: "REF-" + Math.floor(100000 + Math.random() * 900000),
    });
    setSubmitting(false);

    if (dbError) {
      setError("Could not submit payment. Please try again.");
      return;
    }
    onSuccess();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Make Payment">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="rounded-lg bg-brand-50 px-4 py-3 text-center">
          <p className="text-sm text-ink-light">Amount Due</p>
          <p className="text-2xl font-bold text-brand-700">
            {formatUGX(amount)}
          </p>
        </div>

        {/* Method selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-ink">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((m) => {
              const selected = method === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 transition-colors",
                    selected
                      ? methodStyles[m.value]
                      : "border-brand-100 hover:border-brand-300"
                  )}
                >
                  <Smartphone className="h-6 w-6 text-ink" />
                  <span className="text-sm font-medium text-ink">
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Phone number */}
        <Input
          label="Mobile Money Number"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+256700123456"
          required
        />

        <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          After submitting, complete the prompt on your phone. Your payment will
          be marked as paid once verified by the salon.
        </p>

        <div className="flex gap-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={submitting}>
            Submit Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
