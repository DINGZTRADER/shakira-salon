import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { SALON } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: SALON.name,
    template: `%s | ${SALON.name}`,
  },
  description:
    "Book beauty and hair appointments online at Sakira Beauty & Hair Salon, Kampala. Braiding, treatments, manicures, makeup and more.",
  keywords: ["salon", "Kampala", "beauty", "hair", "booking", "Uganda"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-white text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
