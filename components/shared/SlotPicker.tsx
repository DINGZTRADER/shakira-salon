"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateTimeSlots, getUpcomingDates, getDateChipLabel } from "@/lib/slots";
import { formatTime } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface SlotPickerProps {
  staffId: string | null;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  // Exclude this appointment id when checking conflicts (used in reschedule)
  excludeAppointmentId?: string;
}

export function SlotPicker({
  staffId,
  date,
  time,
  onDateChange,
  onTimeChange,
  excludeAppointmentId,
}: SlotPickerProps) {
  const supabase = createClient();
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const dates = getUpcomingDates(21);
  const allSlots = generateTimeSlots(date);

  const loadBooked = useCallback(async () => {
    if (!staffId || !date) {
      setBookedTimes([]);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select("appointment_time, id, status")
      .eq("staff_id", staffId)
      .eq("appointment_date", date)
      .neq("status", "cancelled");

    const { data } = await query;
    const taken = (data ?? [])
      .filter((a) => a.id !== excludeAppointmentId)
      .map((a) => (a.appointment_time as string).slice(0, 5)); // HH:MM
    setBookedTimes(taken);
    setLoading(false);
  }, [supabase, staffId, date, excludeAppointmentId]);

  useEffect(() => {
    loadBooked();
  }, [loadBooked]);

  return (
    <div className="space-y-5">
      {/* Date selector */}
      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Select Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {dates.map((d) => {
            const { weekday, day, month } = getDateChipLabel(d);
            const selected = d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onDateChange(d);
                  onTimeChange("");
                }}
                className={cn(
                  "flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 transition-colors",
                  selected
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-brand-100 bg-white text-ink hover:border-brand-300"
                )}
              >
                <span className="text-xs font-medium">{weekday}</span>
                <span className="text-lg font-bold leading-tight">{day}</span>
                <span className="text-xs">{month}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Select Time
        </label>

        {!staffId && (
          <p className="text-sm text-amber-600">
            Please choose a staff member first to see available times.
          </p>
        )}

        {staffId && loading && (
          <div className="flex items-center gap-2 text-sm text-ink-light">
            <Spinner className="h-4 w-4 text-brand-500" /> Loading availability…
          </div>
        )}

        {staffId && !loading && allSlots.length === 0 && (
          <p className="text-sm text-ink-light">
            No available times for this date.
          </p>
        )}

        {staffId && !loading && allSlots.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {allSlots.map((slot) => {
              const taken = bookedTimes.includes(slot);
              const selected = slot === time;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={taken}
                  onClick={() => onTimeChange(slot)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                    taken
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through"
                      : selected
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-brand-100 bg-white text-ink hover:border-brand-300"
                  )}
                >
                  {formatTime(slot)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
