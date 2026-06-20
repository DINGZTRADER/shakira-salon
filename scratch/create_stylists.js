const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://buzbhxanislhqikhzpfj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1emJoeGFuaXNsaHFpa2h6cGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg5ODg2OSwiZXhwIjoyMDk3NDc0ODY5fQ.sPdr0C1zFtU1giUKLLDwmX3brL6E7_qONFk3fMSw0i4";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const stylistsToCreate = [
  { name: "Diana", email: "diana@shakirasalon.com", bio: "Senior Braids and Dreadlocks designer with 8+ years of styling experience.", exp: 8, phone: "+256757211001", rating: 4.9 },
  { name: "Peter", email: "peter@shakirasalon.com", bio: "Expert dreadlock maintenance and perm shaping specialist.", exp: 6, phone: "+256757211002", rating: 4.8 },
  { name: "Dorcus", email: "dorcus@shakirasalon.com", bio: "Beautician specializing in high-fidelity nail extensions, manicure, and pedicure.", exp: 5, phone: "+256757211003", rating: 5.0 },
  { name: "Michael", email: "michael@shakirasalon.com", bio: "Professional makeup artist and barber. Certified styling trainer.", exp: 7, phone: "+256757211004", rating: 4.7 }
];

async function run() {
  // 1. Get branch ID
  const { data: branch, error: bErr } = await supabase.from("branches").select("id").limit(1).single();
  if (bErr || !branch) {
    console.error("Failed to find a branch:", bErr);
    return;
  }
  const branchId = branch.id;
  console.log("Found Branch ID:", branchId);

  for (const s of stylistsToCreate) {
    console.log(`Creating stylist user: ${s.name}...`);
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: s.email,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        full_name: s.name,
        phone: s.phone
      }
    });

    let userId = "";
    if (authErr) {
      if (authErr.message.includes("already registered") || authErr.message.includes("already exists")) {
        console.log(`User ${s.email} already exists. Attempting to fetch user ID...`);
      } else {
        console.error("Auth creation failed:", authErr);
        continue;
      }
    } else {
      userId = authData.user.id;
    }

    // Fetch user from public.users to get their ID if we didn't get it from creation
    if (!userId) {
      const { data: user, error: uErr } = await supabase
        .from("users")
        .select("id")
        .eq("email", s.email)
        .single();

      if (uErr || !user) {
        console.error("Failed to find user in public.users:", uErr);
        continue;
      }
      userId = user.id;
    }

    console.log(`User ID for ${s.name} is ${userId}`);

    // Update role to 'stylist' in public.users
    const { error: roleErr } = await supabase
      .from("users")
      .update({ role: "stylist", phone: s.phone })
      .eq("id", userId);

    if (roleErr) {
      console.error("Failed to update user role:", roleErr);
    }

    // Create or update stylist profile
    const { data: profile, error: pErr } = await supabase
      .from("stylist_profiles")
      .upsert({
        user_id: userId,
        branch_id: branchId,
        display_name: s.name,
        bio: s.bio,
        years_experience: s.exp,
        rating_average: s.rating,
        rating_count: 18,
        is_bookable: true
      })
      .select()
      .single();

    if (pErr) {
      console.error("Failed to upsert stylist profile:", pErr);
    } else {
      console.log(`Successfully created stylist profile for ${s.name}:`, profile.user_id);
    }
  }
}

run();
