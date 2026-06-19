"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, Clock, User as UserIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { BookingStatusBadge } from "@/components/shared/BookingStatusBadge";
import { SlotPicker } from "@/components/shared/SlotPicker";
import { formatDate, formatTime, formatUGX, canReschedule } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/lib/types";

export default function MyBookingsPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useUser();

  const [bookings, setBookings] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Reschedule modal state
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, service:services(*), staff:staff(*)")
      .eq("customer_id", profile.id)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });
    // Cast via unknown: embedded relations are asserted (the select includes them).
    setBookings((data ?? []) as unknown as AppointmentWithRelations[]);
    setLoading(false);
  }, [supabase, profile]);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setActionId(id);
    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    setActionId(null);
    load();
  };

  const openReschedule = (b: AppointmentWithRelations) => {
    setRescheduleId(b.id);
    setNewDate(b.appointment_date);
    setNewTime(b.appointment_time.slice(0, 5));
    setRescheduleError(null);
  };

  const submitReschedule = async () => {
    if (!rescheduleId || !newDate || !newTime) {
      setRescheduleError("Please select a new date and time.");
      return;
    }
    setActionId(rescheduleId);
    const { error } = await supabase
      .from("appointments")
      .update({
        appointment_date: newDate,
        appointment_time: `${newTime}:00`,
        status: "rescheduled",
      })
      .eq("id", rescheduleId);
    setActionId(null);

    if (error) {
      setRescheduleError(
        error.code === "23505"
          ? "That slot is taken. Please choose another."
          : "Could not reschedule. Try again."
      );
      return;
    }
    setRescheduleId(null);
    load();
  };

  const currentReschedule = bookings.find((b) => b.id === rescheduleId);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Spinner className="mx-auto text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ink">My Bookings</h1>
      <p className="mt-2 text-ink-light">
        View, reschedule or cancel your appointments.
      </p>

      {bookings.length === 0 ? (
        <Card className="mt-8">
          <CardBody className="text-center text-ink-light">
            You have no bookings yet.
          </CardBody>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b) => {
            const editable =
              (b.status === "pending" ||
                b.status === "confirmed" ||
                b.status === "rescheduled") &&
              canReschedule(b.appointment_date, b.appointment_time);
            return (
              <Card key={b.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">
                        {b.service?.name}
                      </h3>
                      <p className="text-sm font-medium text-brand-600">
                        {b.service && formatUGX(b.service.price)}
                      </p>
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-ink-light sm:grid-cols-3">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-brand-500" />
                      {formatDate(b.appointment_date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-brand-500" />
                      {formatTime(b.appointment_time)}
                    </span>
                    {b.staff && (
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="h-4 w-4 text-brand-500" />
                        {b.staff.name}
                      </span>
                    )}
                  </div>

                  {b.notes && (
                    <p className="mt-3 text-sm text-ink-light">
                      <span className="font-medium">Notes:</span> {b.notes}
                    </p>
                  )}

                  {editable && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReschedule(b)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={actionId === b.id}
                        onClick={() => handleCancel(b.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {!editable &&
                    b.status !== "cancelled" &&
                    b.status !== "completed" && (
                      <p className="mt-4 text-xs text-amber-600">
                        Changes are only allowed up to 24 hours before the
                        appointment.
                      </p>
                    )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleId && currentReschedule && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                Reschedule Appointment
              </h2>
              <button
                onClick={() => setRescheduleId(null)}
                aria-label="Close"
                className="rounded-lg p-1 text-ink hover:bg-brand-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {rescheduleError && (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {rescheduleError}
              </div>
            )}

            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              <SlotPicker
                staffId={currentReschedule.staff_id || null}
                date={newDate}
                time={newTime}
                onDateChange={(d) => {
                  setNewDate(d);
                  setNewTime("");
                }}
                onTimeChange={setNewTime}
                excludeAppointmentId={rescheduleId}
              />
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setRescheduleId(null)}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                loading={actionId === rescheduleId}
                onClick={submitReschedule}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
