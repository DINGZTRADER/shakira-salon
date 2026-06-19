"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  User as UserIcon,
  Phone,
  Check,
  X,
  CheckCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { BookingStatusBadge } from "@/components/shared/BookingStatusBadge";
import { formatDate, formatTime, formatUGX } from "@/lib/utils";
import type { AppointmentWithRelations, AppointmentStatus } from "@/lib/types";

type StatusFilter = "all" | AppointmentStatus;
type DateFilter = "all" | "today" | "upcoming";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function todayISO() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AdminBookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, service:services(*), staff:staff(*), customer:users(*)")
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: true });
    // Cast via unknown: embedded relations are asserted (the select includes them).
    setBookings((data ?? []) as unknown as AppointmentWithRelations[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    setBusyId(id);
    await supabase.from("appointments").update({ status }).eq("id", id);
    setBusyId(null);
    load();
  };

  const filtered = useMemo(() => {
    const today = todayISO();
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (dateFilter === "today" && b.appointment_date !== today) return false;
      if (dateFilter === "upcoming" && b.appointment_date < today) return false;
      return true;
    });
  }, [bookings, statusFilter, dateFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Bookings</h1>
      <p className="mt-1 text-ink-light">
        View and manage all customer appointments.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
                (statusFilter === f.value
                  ? "bg-brand-500 text-white"
                  : "bg-white text-ink-light hover:bg-brand-50")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Filter by date"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center">
          <Spinner className="mx-auto text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="mt-6">
          <CardBody className="text-center text-ink-light">
            No bookings match these filters.
          </CardBody>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((b) => (
            <Card key={b.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink">
                        {b.service?.name}
                      </h3>
                      <span className="text-sm font-medium text-brand-600">
                        {b.service && formatUGX(b.service.price)}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-1.5 text-sm text-ink-light sm:grid-cols-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-brand-500" />
                        {formatDate(b.appointment_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-brand-500" />
                        {formatTime(b.appointment_time)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="h-4 w-4 text-brand-500" />
                        {b.customer?.full_name}
                        {b.staff && (
                          <span className="text-gray-400">· {b.staff.name}</span>
                        )}
                      </span>
                      {b.customer?.phone && (
                        <a
                          href={`tel:${b.customer.phone}`}
                          className="flex items-center gap-1.5 hover:text-brand-600"
                        >
                          <Phone className="h-4 w-4 text-brand-500" />
                          {b.customer.phone}
                        </a>
                      )}
                    </div>

                    {b.notes && (
                      <p className="mt-2 text-sm text-ink-light">
                        <span className="font-medium">Notes:</span> {b.notes}
                      </p>
                    )}
                  </div>

                  <BookingStatusBadge status={b.status} />
                </div>

                {/* Status actions */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-100 pt-3">
                  {(b.status === "pending" ||
                    b.status === "rescheduled") && (
                    <Button
                      size="sm"
                      loading={busyId === b.id}
                      onClick={() => updateStatus(b.id, "confirmed")}
                    >
                      <Check className="h-4 w-4" /> Confirm
                    </Button>
                  )}

                  {b.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === b.id}
                      onClick={() => updateStatus(b.id, "completed")}
                    >
                      <CheckCheck className="h-4 w-4" /> Mark Completed
                    </Button>
                  )}

                  {b.status !== "cancelled" && b.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busyId === b.id}
                      onClick={() => updateStatus(b.id, "cancelled")}
                    >
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                  )}

                  {(b.status === "cancelled" || b.status === "completed") && (
                    <span className="text-xs text-ink-light">
                      No further actions available.
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
