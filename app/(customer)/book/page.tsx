"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/book/calendar");
  }, [router]);

  return (
    <div className="py-20 text-center text-ink-light">
      Redirecting to booking portal…
    </div>
  );
}
