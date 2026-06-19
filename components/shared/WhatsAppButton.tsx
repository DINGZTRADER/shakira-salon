import { MessageCircle } from "lucide-react";
import { SALON } from "@/lib/constants";
import { formatWhatsAppNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  message?: string;
  variant?: "floating" | "inline";
  className?: string;
}

export function WhatsAppButton({
  message = "Hello Sakira, I'd like to make an enquiry.",
  variant = "floating",
  className,
}: WhatsAppButtonProps) {
  const number = formatWhatsAppNumber(SALON.whatsapp);
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700",
          className
        )}
      >
        <MessageCircle className="h-4 w-4" />
        Chat on WhatsApp
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
        className
      )}
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
