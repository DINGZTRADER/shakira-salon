import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { BookingStatusBadge } from "@/components/shared/BookingStatusBadge";
import { formatTime } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

function todayISO() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const today = todayISO();

  // Counts
  const [
    { count: totalCount },
    { count: pendingCount },
    { count: confirmedCount },
    { count: todayCount },
  ] = await Promise.all([
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("appointment_date", today),
  ]);

  // Today's schedule
  const { data: todaysData } = await supabase
    .from("appointments")
    .select("*, service:services(*), staff:staff(*), customer:users(*)")
    .eq("appointment_date", today)
    .neq("status", "cancelled")
    .order("appointment_time", { ascending: true });

  // Cast via unknown: embedded relations are asserted (the select includes them).
  const todays = (todaysData ?? []) as unknown as AppointmentWithRelations[];

  const stats = [
    {
      label: "Total Bookings",
      value: totalCount ?? 0,
      icon: CalendarDays,
      color: "text-brand-600 bg-brand-100",
    },
    {
      label: "Pending",
      value: pendingCount ?? 0,
      icon: AlertCircle,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "Confirmed",
      value: confirmedCount ?? 0,
      icon: CheckCircle2,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Today",
      value: todayCount ?? 0,
      icon: Clock,
      color: "text-blue-600 bg-blue-100",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Dashboard</h1>
      <p className="mt-1 text-ink-light">Overview of salon activity.</p>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardBody className="flex items-center gap-4">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full ${color}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold text-ink">{value}</p>
                <p className="text-xs text-ink-light">{label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Today's schedule */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Today&apos;s Schedule</h2>
        {todays.length === 0 ? (
          <Card className="mt-4">
            <CardBody className="text-center text-ink-light">
              No appointments scheduled for today.
            </CardBody>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {todays.map((a) => (
              <Card key={a.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center rounded-lg bg-brand-50 px-3 py-1.5">
                      <Clock className="h-4 w-4 text-brand-500" />
                      <span className="mt-0.5 text-xs font-semibold text-brand-700">
                        {formatTime(a.appointment_time)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-ink">{a.service?.name}</p>
                      <p className="flex items-center gap-1.5 text-sm text-ink-light">
                        <UserIcon className="h-3.5 w-3.5" />
                        {a.customer?.full_name}
                        {a.staff && <span>· with {a.staff.name}</span>}
                      </p>
                    </div>
                  </div>
                  <BookingStatusBadge status={a.status} />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
