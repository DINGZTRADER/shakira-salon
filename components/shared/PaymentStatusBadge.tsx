import { Badge } from "@/components/ui/Badge";
import type { PaymentStatus } from "@/lib/types";

const map: Record<
  PaymentStatus,
  { variant: "success" | "warning" | "danger" | "neutral"; label: string }
> = {
  paid: { variant: "success", label: "Paid" },
  succeeded: { variant: "success", label: "Paid" },
  pending: { variant: "warning", label: "Payment Pending" },
  requires_action: { variant: "warning", label: "Action Required" },
  failed: { variant: "danger", label: "Payment Failed" },
  expired: { variant: "danger", label: "Payment Expired" },
  refunded: { variant: "neutral", label: "Refunded" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { variant, label } = map[status] || { variant: "neutral", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
