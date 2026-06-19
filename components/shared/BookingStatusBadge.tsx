import { Badge } from "@/components/ui/Badge";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import type { AppointmentStatus } from "@/lib/types";

const variantMap: Record<
  AppointmentStatus,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "danger",
  completed: "info",
  rescheduled: "neutral",
  draft: "neutral",
  held: "warning",
  no_show: "danger",
};

export function BookingStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant={variantMap[status] || "neutral"}>
      {APPOINTMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
