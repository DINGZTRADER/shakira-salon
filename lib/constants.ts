// =============================================================
// App-wide constants
// =============================================================

export const SALON = {
  name: process.env.NEXT_PUBLIC_SALON_NAME ?? "Sakira Beauty & Hair Salon",
  phone: process.env.NEXT_PUBLIC_SALON_PHONE ?? "+256700123456",
  whatsapp: process.env.NEXT_PUBLIC_SALON_WHATSAPP ?? "+256700123456",
  instagram: process.env.NEXT_PUBLIC_SALON_INSTAGRAM ?? "sakirabeautyug",
  location:
    process.env.NEXT_PUBLIC_SALON_LOCATION ?? "Kampala Road, Kampala, Uganda",
} as const;

// Business hours by day (0 = Sunday ... 6 = Saturday)
export const BUSINESS_HOURS: Record<number, { open: string; close: string } | null> = {
  0: { open: "10:00", close: "17:00" }, // Sunday
  1: { open: "08:00", close: "20:00" }, // Monday
  2: { open: "08:00", close: "20:00" },
  3: { open: "08:00", close: "20:00" },
  4: { open: "08:00", close: "20:00" },
  5: { open: "08:00", close: "20:00" },
  6: { open: "08:00", close: "20:00" }, // Saturday
};

// Time slots generated at 30-min intervals
export const SLOT_INTERVAL_MINUTES = 30;

// Reschedule/cancel cutoff (hours before appointment)
export const RESCHEDULE_CUTOFF_HOURS = 24;

export const PAYMENT_METHODS = [
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "airtel_money", label: "Airtel Money" },
] as const;

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  rescheduled: "Rescheduled",
  draft: "Draft",
  held: "Held",
  no_show: "No Show",
};

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/book", label: "Book Appointment" },
  { href: "/my-bookings", label: "My Bookings" },
  { href: "/contact", label: "Contact" },
] as const;
