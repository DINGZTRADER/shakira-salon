import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SocialChannel, ConversationStatus, MessageDirection } from "@/lib/types";

// WhatsApp webhook validation (GET) and message processor (POST)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Simulating WhatsApp verification flow
  if (mode === "subscribe" && token === "shakira_salon_token_2026") {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = await createClient();

  // Inspect the payload (WhatsApp format: entry -> changes -> value -> messages)
  const entry = body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];
  const senderPhone = message?.from || value?.contacts?.[0]?.wa_id || "+256700123456";
  const messageText = message?.text?.body || message?.button?.text || "";

  if (!messageText) {
    return NextResponse.json({ success: true });
  }

  // 1. Get or create social account for WhatsApp
  let { data: account } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("channel", "whatsapp")
    .single();

  if (!account) {
    // Let's create one linked to our branch
    const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
    if (branch) {
      const { data: newAccount } = await supabase
        .from("social_accounts")
        .insert({
          branch_id: branch.id,
          channel: "whatsapp" as SocialChannel,
          display_name: "Shakira Salon",
          handle: "+256700123456",
          is_active: true,
        })
        .select()
        .single();
      account = newAccount;
    }
  }

  if (!account) {
    return NextResponse.json({ error: "No branch or social account found" }, { status: 500 });
  }

  // 2. Find or create user profile by phone
  let { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("phone", senderPhone)
    .single();

  if (!user) {
    // Create new customer user
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        full_name: value?.contacts?.[0]?.profile?.name || "WhatsApp Customer",
        phone: senderPhone,
        email: null,
        role: "customer",
      })
      .select()
      .single();
    user = newUser;
  }

  // 3. Find or create active conversation thread
  const { data: conversation } = await supabase
    .from("social_conversations")
    .select("*")
    .eq("account_id", account.id)
    .eq("external_thread_id", senderPhone)
    .single();

  let activeConv: any = conversation;

  if (!activeConv) {
    const { data: newConv } = await supabase
      .from("social_conversations")
      .insert({
        account_id: account.id,
        customer_id: user?.id || null,
        channel: "whatsapp" as SocialChannel,
        external_thread_id: senderPhone,
        status: "bot_active" as ConversationStatus,
        bot_state: { step: "welcome" },
      })
      .select()
      .single();
    activeConv = newConv;
  }

  if (!activeConv) {
    return NextResponse.json({ error: "Could not initialize conversation" }, { status: 500 });
  }

  // 4. Save inbound message
  await supabase.from("social_messages").insert({
    conversation_id: activeConv.id,
    direction: "inbound" as MessageDirection,
    sender_external_id: senderPhone,
    body: messageText,
    media_urls: [],
    payload: {},
  });

  // 5. Bot State Machine response generator
  if (activeConv.status === "bot_active") {
    let reply = "Hello! Welcome to Shakira Beauty. How can I help you today?";
    const botState = (activeConv.bot_state as Record<string, any>) || { step: "welcome" };
    let nextStep = "welcome";

    if (botState.step === "welcome" || messageText.toLowerCase().includes("book")) {
      reply = "Welcome to Shakira Beauty & Wellness Salon! What service would you like to book?\n\n1. Braids Installation\n2. Dreadlock Retwist\n3. Perm Finish\n4. Hair Dye Gloss";
      nextStep = "choose_service";
    } else if (botState.step === "choose_service") {
      let svcName = "Braids Installation";
      if (messageText.includes("2") || messageText.toLowerCase().includes("dread")) svcName = "Dreadlock Retwist";
      if (messageText.includes("3") || messageText.toLowerCase().includes("perm")) svcName = "Perm Finish";
      if (messageText.includes("4") || messageText.toLowerCase().includes("dye")) svcName = "Hair Dye Gloss";

      const { data: svc } = await supabase.from("services").select("*").eq("is_active", true).limit(1).single();

      reply = `You have selected ${svcName}. Please select your preferred day:\n\n1. Today\n2. Tomorrow\n3. Next Day`;
      nextStep = "choose_time";
      botState.service = svcName;
      botState.service_id = svc?.id;
    } else if (botState.step === "choose_time") {
      reply = "Great! What time would you prefer?\n\n- 10:00 AM\n- 12:30 PM\n- 3:00 PM\n- 4:30 PM";
      nextStep = "choose_stylist";
      botState.day = messageText;
    } else if (botState.step === "choose_stylist") {
      reply = "We have the following stylists available. Who would you like to book with?\n\n1. Amara\n2. Noelle\n3. Any Stylist";
      nextStep = "confirm_booking";
      botState.time = messageText;
    } else if (botState.step === "confirm_booking") {
      reply = `Thank you! I've held your slot for 10 minutes:\n\nService: ${botState.service}\nTime: ${botState.day} at ${botState.time}\n\nTo confirm, please select a payment option to pay the deposit:\n\n1. Pay MTN MoMo\n2. Pay Airtel Money\n3. Pay at Salon`;
      nextStep = "payment_processing";
      botState.stylist = messageText;
    } else if (botState.step === "payment_processing") {
      reply = "Initiating payment prompt on your mobile number... Please check your phone for the PIN request and complete the deposit to confirm your booking. Thank you!";
      nextStep = "completed";
      // Let's create actual appointment draft
      const { data: branch } = await supabase.from("branches").select("id").limit(1).single();
      const { data: stylist } = await supabase.from("stylist_profiles").select("user_id").limit(1).single();
      
      if (branch && user) {
        const startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + 2);
        const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);

        const { data: appt } = await supabase.from("appointments").insert({
          customer_id: user.id,
          stylist_id: stylist?.user_id || user.id, // Fallback
          branch_id: branch.id,
          status: "pending",
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          subtotal_ugx: 185000,
          deposit_due_ugx: 62000,
          total_ugx: 185000,
          appointment_date: startsAt.toISOString().slice(0, 10),
          appointment_time: "10:00:00",
          notes: "",
        }).select().single();

        if (appt && activeConv) {
          // Link appointment to conversation
          await supabase.from("social_conversations").update({
            appointment_id: appt.id
          }).eq("id", activeConv.id);
        }
      }
    }

    // Save outbound message (the bot's response)
    await supabase.from("social_messages").insert({
      conversation_id: activeConv.id,
      direction: "outbound" as MessageDirection,
      sender_external_id: "shakira_bot",
      body: reply,
      media_urls: [],
      payload: {},
    });

    // Update bot state
    await supabase.from("social_conversations").update({
      bot_state: { ...botState, step: nextStep },
      last_message_at: new Date().toISOString(),
    }).eq("id", activeConv.id);
  }

  return NextResponse.json({ success: true });
}
