"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, ChevronRight, User as UserIcon, Calendar, Check, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, formatUGX } from "@/lib/utils";

interface Stylist {
  user_id: string;
  display_name: string;
  bio: string | null;
  years_experience: number;
  rating_average: number;
  rating_count: number;
  is_bookable: boolean;
  avatar_url: string | null;
}

function StylistStep() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const serviceId = searchParams.get("serviceId") || "";
  const addOns = searchParams.get("addOns") || "";
  const date = searchParams.get("date") || "";
  const time = searchParams.get("time") || "";
  const total = searchParams.get("total") || "0";
  const deposit = searchParams.get("deposit") || "0";

  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStylistId, setSelectedStylistId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load stylists from stylist_profiles
  useEffect(() => {
    (async () => {
      // First check if profiles exist
      const { data, error: stErr } = await supabase
        .from("stylist_profiles")
        .select(`
          user_id,
          display_name,
          bio,
          years_experience,
          rating_average,
          rating_count,
          is_bookable,
          user:users(avatar_url)
        `);

      if (stErr) {
        setError("Could not load stylist profiles.");
      } else {
        // Flatten user avatar_url
        const mapped = (data ?? []).map((item: any) => ({
          user_id: item.user_id,
          display_name: item.display_name,
          bio: item.bio,
          years_experience: item.years_experience,
          rating_average: Number(item.rating_average || 5.0),
          rating_count: item.rating_count || 12,
          is_bookable: item.is_bookable,
          avatar_url: item.user?.avatar_url || null,
        }));
        setStylists(mapped);
      }
      setLoading(false);
    })();
  }, [supabase]);

  // Insert mock stylists if none are found in the DB
  const handleSeedFallback = async () => {
    setLoading(true);
    // Create branch if not exists
    let branchId = "";
    const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
    if (branch) {
      branchId = branch.id;
    } else {
      const { data: newBranch } = await supabase.from("branches").insert({
        name: "Shakira Main",
        slug: "shakira-main-fallback",
        address_line_1: "Kampala Rd",
        city: "Kampala"
      }).select().single();
      if (newBranch) branchId = newBranch.id;
    }

    // Create stylist users & profiles
    const mockStylists = [
      { name: "Amara K.", bio: "Expert braider and dreadlock master.", exp: 6, rating: 4.9 },
      { name: "Noelle N.", bio: "Color specialist and perm designer.", exp: 4, rating: 4.8 },
      { name: "Jules M.", bio: "Beautician and nails/makeup specialist.", exp: 5, rating: 5.0 }
    ];

    for (const item of mockStylists) {
      // Create user
      const dummyId = crypto.randomUUID();
      const { error: userErr } = await supabase.from("users").insert({
        id: dummyId,
        full_name: item.name,
        role: "stylist",
        phone: "+256700" + Math.floor(100000 + Math.random() * 900000),
        email: item.name.toLowerCase().replace(" ", "") + "@shakirasalon.com"
      });

      if (!userErr) {
        await supabase.from("stylist_profiles").insert({
          user_id: dummyId,
          branch_id: branchId,
          display_name: item.name,
          bio: item.bio,
          years_experience: item.exp,
          rating_average: item.rating,
          rating_count: 24,
          is_bookable: true
        });
      }
    }

    // Reload
    window.location.reload();
  };

  const handleNext = async () => {
    if (!selectedStylistId) return;

    // Create a booking hold in DB
    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("id").limit(1).single();
    const customerId = user?.user?.id || profile?.id; // fallback if no auth session

    if (!customerId) {
      setError("Please sign in or register to complete your reservation.");
      return;
    }

    // Get branch
    const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
    if (!branch) {
      setError("Active salon branch not found.");
      return;
    }

    // Calculate dates
    const startsAt = new Date(`${date}T${time}:00`);
    const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000); // 90 mins default
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min hold

    const { data: hold, error: holdErr } = await supabase
      .from("booking_holds")
      .insert({
        customer_id: customerId,
        stylist_id: selectedStylistId,
        branch_id: branch.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "active",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (holdErr) {
      setError("That slot was just reserved by another customer. Please choose a different slot.");
      return;
    }

    const query = new URLSearchParams({
      serviceId,
      addOns,
      date,
      time,
      total,
      deposit,
      stylistId: selectedStylistId,
      holdId: hold.id,
    });

    router.push(`/book/checkout?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center text-ink-light">
        <div className="animate-pulse text-lg font-medium">Loading professional stylists list…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Booking Header Progress */}
      <div className="mb-8 flex items-center justify-between text-xs font-semibold tracking-wider text-ink-light uppercase">
        <span className="text-ink-light">1. Date & Service</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-brand-600 border-b-2 border-brand-500 pb-1">2. Select Stylist</span>
        <ChevronRight className="h-4 w-4" />
        <span>3. Checkout</span>
      </div>

      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Choose Your Stylist</h1>
          <p className="mt-2 text-ink-light">Select from our certified beauty and hair experts.</p>
        </div>
        
        {stylists.length === 0 && (
          <Button onClick={handleSeedFallback} variant="outline">
            Quick-Seed Sample Stylists
          </Button>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {stylists.length === 0 ? (
        <Card className="p-8 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-brand-300" />
          <h3 className="mt-4 text-lg font-bold text-ink">No Stylists Available</h3>
          <p className="mt-2 text-ink-light max-w-sm mx-auto">No stylists are registered or active at the moment. Use the quick-seed button above to create mock profiles.</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Default Any Stylist */}
          <button
            type="button"
            onClick={() => setSelectedStylistId(stylists[0]?.user_id || "")}
            className={cn(
              "flex flex-col justify-between rounded-2xl border p-5 text-left transition-all bg-white",
              selectedStylistId === stylists[0]?.user_id
                ? "border-brand-500 bg-brand-50/50 shadow-sm ring-1 ring-brand-500"
                : "border-brand-100 hover:border-brand-300"
            )}
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600 font-bold">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-ink">Any Available Stylist</h3>
                  <span className="text-xs text-brand-600 font-medium">Fastest confirmation</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-ink-light">We will match you with the best stylist available for your selected treatment and time slot.</p>
            </div>
            
            <div className="mt-6 flex items-center justify-between border-t border-brand-50 pt-4 w-full">
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> High availability
              </span>
              <span className="text-xs font-semibold text-brand-600">Select</span>
            </div>
          </button>

          {/* Real Stylists */}
          {stylists.map((st) => {
            const selected = st.user_id === selectedStylistId;
            return (
              <button
                key={st.user_id}
                type="button"
                onClick={() => setSelectedStylistId(st.user_id)}
                className={cn(
                  "flex flex-col justify-between rounded-2xl border p-5 text-left transition-all bg-white",
                  selected
                    ? "border-brand-500 bg-brand-50/50 shadow-sm ring-1 ring-brand-500"
                    : "border-brand-100 hover:border-brand-300"
                )}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-bold text-sm">
                      {st.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-ink">{st.display_name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold text-ink">{st.rating_average.toFixed(1)}</span>
                        <span className="text-[10px] text-ink-light">({st.rating_count} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-ink-light line-clamp-3">{st.bio}</p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-brand-50 pt-4 w-full">
                  <span className="text-xs text-brand-700 font-medium">
                    {st.years_experience} years exp
                  </span>
                  <span className="text-xs font-semibold text-brand-600">Select</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Action rails */}
      <div className="mt-10 flex flex-col justify-between gap-4 border-t border-brand-100 pt-6 sm:flex-row">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
        <Button
          size="lg"
          disabled={!selectedStylistId}
          onClick={handleNext}
        >
          Proceed to Payment <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function BookStylistPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-light">Loading Step…</div>}>
      <StylistStep />
    </Suspense>
  );
}
