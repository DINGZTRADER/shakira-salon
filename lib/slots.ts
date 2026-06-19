import { BUSINESS_HOURS, SLOT_INTERVAL_MINUTES } from "./constants";

const pad = (n: number) => n.toString().padStart(2, "0");

// Returns business hours for a given date (or null if closed)
export function getBusinessHours(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return BUSINESS_HOURS[date.getDay()] ?? null;
}

// Generate all time slots (HH:MM) for a date based on business hours.
// Skips past times when the date is today.
export function generateTimeSlots(dateStr: string): string[] {
  const date = new Date(dateStr + "T00:00:00");
  const hours = BUSINESS_HOURS[date.getDay()];
  if (!hours) return [];

  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);

  let cursor = openH * 60 + openM;
  const end = closeH * 60 + closeM;

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: string[] = [];
  while (cursor < end) {
    if (!isToday || cursor > nowMinutes) {
      slots.push(`${pad(Math.floor(cursor / 60))}:${pad(cursor % 60)}`);
    }
    cursor += SLOT_INTERVAL_MINUTES;
  }
  return slots;
}

// Generate the next `count` selectable dates (YYYY-MM-DD)
export function getUpcomingDates(count = 30): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    );
  }
  return dates;
}

// Short labels for a date chip
export function getDateChipLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return {
    weekday: isToday
      ? "Today"
      : d.toLocaleDateString("en-UG", { weekday: "short" }),
    day: d.getDate(),
    month: d.toLocaleDateString("en-UG", { month: "short" }),
  };
}
