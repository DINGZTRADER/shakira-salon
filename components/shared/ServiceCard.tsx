import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatUGX } from "@/lib/utils";
import type { Service } from "@/lib/types";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
          <span className="whitespace-nowrap text-base font-bold text-brand-600">
            {formatUGX(service.price)}
          </span>
        </div>

        {service.description && (
          <p className="mt-2 flex-1 text-sm text-ink-light">
            {service.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{service.duration_minutes} min</span>
        </div>

        <Button asChild className="mt-4" fullWidth>
          <Link
            href={`/book?service=${service.id}`}
            className="flex w-full items-center justify-center"
          >
            Book Now
          </Link>
        </Button>
      </CardBody>
    </Card>
  );
}
