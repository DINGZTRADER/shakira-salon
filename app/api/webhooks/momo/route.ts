import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus, AppointmentStatus, MessageDirection } from "@/lib/types";

// MoMo payment callback hook (receives MTN/Airtel response)
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const supabase = await createClient();

    // MTN MoMo & Airtel Money callbacks typically submit a transaction status, reference and external ID
    const transactionId = payload.transactionId || payload.reference;
    const status = payload.status; // 'SUCCESSFUL', 'FAILED', etc.
    const amount = payload.amount;

    if (!transactionId) {
      return NextResponse.json({ error: "Missing transaction reference" }, { status: 400 });
    }

    // 1. Find payment by provider reference
    const { data: payment, error: fetchErr } = await supabase
      .from("payments")
      .select("*, appointment:appointments(*)")
      .eq("provider_reference", transactionId)
      .single();

    let activePayment: any = payment;

    if (fetchErr || !activePayment) {
      // If reference not matched directly, find the most recent pending payment
      const { data: fallbackPayment } = await supabase
        .from("payments")
        .select("*, appointment:appointments(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!fallbackPayment) {
        return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
      }
      
      // Associate reference
      await supabase
        .from("payments")
        .update({ provider_reference: transactionId })
        .eq("id", fallbackPayment.id);
      
      activePayment = fallbackPayment;
    }

    if (!activePayment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const isSuccess = status === "SUCCESSFUL" || payload.state === "COMPLETED" || status === "success";

    // 2. Update payment status
    const dbPaymentStatus: PaymentStatus = isSuccess ? "succeeded" : "failed";
    await supabase
      .from("payments")
      .update({
        status: dbPaymentStatus,
        provider_status_payload: payload,
        succeeded_at: isSuccess ? new Date().toISOString() : null,
        failed_at: !isSuccess ? new Date().toISOString() : null,
      })
      .eq("id", activePayment.id);

    // 3. If succeeded, update appointment status to confirmed
    if (isSuccess && activePayment.appointment_id) {
      await supabase
        .from("appointments")
        .update({
          status: "confirmed" as AppointmentStatus,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", activePayment.appointment_id);

      // 4. Send WhatsApp confirmation notification via the bot conversation
      const { data: conversation } = await supabase
        .from("social_conversations")
        .select("*")
        .eq("appointment_id", activePayment.appointment_id)
        .single();

      if (conversation) {
        const text = `🎉 *Payment Confirmed!*\n\nWe have received your deposit of UGX ${new Intl.NumberFormat().format(amount || activePayment.amount_ugx)}.\n\nYour appointment is officially confirmed. See you soon!`;
        
        await supabase.from("social_messages").insert({
          conversation_id: conversation.id,
          direction: "outbound" as MessageDirection,
          sender_external_id: "system",
          body: text,
        });

        // Set status to open/staff_active
        await supabase
          .from("social_conversations")
          .update({ status: "booked" })
          .eq("id", conversation.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
