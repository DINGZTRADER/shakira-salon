"use client";

import { useEffect, useState, Suspense, use } from "react";
import { useRouter } from "next/navigation";
import { Star, MessageSquare, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate, cn } from "@/lib/utils";

function ReviewForm({ params }: { params: Promise<{ appointmentId: string }> }) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.appointmentId;
  const supabase = createClient();
  const router = useRouter();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoPermission, setPhotoPermission] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: apptErr } = await supabase
        .from("appointments")
        .select("*, stylist:stylist_profiles(*)")
        .eq("id", appointmentId)
        .single();

      if (apptErr || !data) {
        setError("Appointment details not found.");
      } else {
        setAppointment(data);
      }
      setLoading(false);
    })();
  }, [supabase, appointmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: fallbackUser } = await supabase.from("users").select("id").limit(1).single();
    const customerId = user?.id || fallbackUser?.id;

    if (!customerId || !appointment) {
      setError("Authorization required.");
      setSubmitting(false);
      return;
    }

    const { error: revErr } = await supabase.from("reviews").insert({
      appointment_id: appointmentId,
      customer_id: customerId,
      stylist_id: appointment.stylist_id,
      rating,
      comment: comment.trim() || null,
      photo_permission: photoPermission,
      is_public: true,
    });

    setSubmitting(false);

    if (revErr) {
      setError("Could not submit your review. You may have already reviewed this appointment.");
      return;
    }

    setSuccess(true);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-ink-light">
        <div className="animate-pulse text-lg font-medium">Loading visit details…</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card className="border-brand-100 shadow-xl">
          <CardBody className="text-center p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-brand-600 animate-bounce" />
            <h1 className="mt-6 text-2xl font-bold text-ink">Thank You!</h1>
            <p className="mt-3 text-sm text-ink-light">
              Your feedback helps us maintain the highest salon standards in Kampala.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push("/book/calendar")} variant="primary">
                Book Next Appointment <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push("/my-bookings")}>
                My Bookings
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Rate Your Stylist</h1>
        <p className="mt-2 text-ink-light">How was your salon visit on {appointment && formatDate(appointment.starts_at.slice(0, 10))}?</p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardBody className="p-6 text-center space-y-4">
            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Stylist</span>
            <h3 className="text-xl font-bold text-ink">{appointment?.stylist?.display_name || "Your Stylist"}</h3>
            
            {/* Stars */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none transition-transform active:scale-95"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      star <= rating ? "fill-amber-400 text-amber-400" : "text-brand-200 hover:text-amber-200"
                    )}
                  />
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Feedback text */}
        <div className="space-y-2">
          <label htmlFor="comment" className="block text-sm font-semibold text-ink">
            Tell us about your experience
          </label>
          <textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you love? Any tips for your stylist?"
            className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 text-ink placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Repost permission check box */}
        <div className="rounded-xl border border-brand-100 bg-brand-50/20 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={photoPermission}
              onChange={(e) => setPhotoPermission(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="text-xs">
              <span className="block font-semibold text-ink">Permission to Share</span>
              <span className="block text-ink-light mt-0.5">I permit Shakira Salon to share photos of my hairstyle or review on Instagram highlighting reels.</span>
            </div>
          </label>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={submitting}
        >
          Submit Review
        </Button>
      </form>
    </div>
  );
}

export default function BookReviewPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-light">Loading Review Form…</div>}>
      <ReviewForm params={params} />
    </Suspense>
  );
}
