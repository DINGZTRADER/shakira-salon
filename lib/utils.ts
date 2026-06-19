import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RESCHEDULE_CUTOFF_HOURS } from "./constants";

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Format UGX currency (no decimals)
export function formatUGX(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format a date string (YYYY-MM-DD) for display
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-UG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date + "T00:00:00"));
}

// Format a time string (HH:MM or HH:MM:SS) to 12-hour
export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

// Check whether an appointment can still be rescheduled/cancelled
export function canReschedule(date: string, time: string): boolean {
  const apptDateTime = new Date(`${date}T${time}`);
  const cutoff = new Date(
    apptDateTime.getTime() - RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000
  );
  return new Date() < cutoff;
}

// Format phone for WhatsApp link (digits only)
export function formatWhatsAppNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}
