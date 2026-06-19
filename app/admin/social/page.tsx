"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MessageSquare, MessageCircle, Star, Sparkles, Smartphone, Send, Calendar, Clock, User, Check, RefreshCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatUGX, formatTime, cn } from "@/lib/utils";

export default function AdminSocialDashboard() {
  const supabase = createClient();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageBody, setNewMessageBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [triggeringMoMo, setTriggeringMoMo] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    leadsCount: 18,
    botActiveCount: 7,
    completedCount: 31,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads
  const loadThreads = useCallback(async () => {
    const { data: convs } = await supabase
      .from("social_conversations")
      .select("*, customer:users(*), appointment:appointments(*)");
    
    const formatted = (convs ?? []).map((c: any) => ({
      ...c,
      display_name: c.customer?.full_name || "WhatsApp Customer",
      snippet: c.bot_state?.service ? `${c.bot_state.service} hold` : "Chat initialized",
    }));

    setConversations(formatted);
    if (formatted.length > 0 && !selectedConvId) {
      setSelectedConvId(formatted[0].id);
    }
    setLoading(false);
  }, [supabase, selectedConvId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Fetch messages for selected thread
  const loadMessages = useCallback(async () => {
    if (!selectedConvId) return;
    const { data } = await supabase
      .from("social_messages")
      .select("*")
      .eq("conversation_id", selectedConvId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [supabase, selectedConvId]);

  useEffect(() => {
    loadMessages();
  }, [selectedConvId, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageBody.trim() || !selectedConvId) return;

    setSending(true);
    const { error } = await supabase.from("social_messages").insert({
      conversation_id: selectedConvId,
      direction: "outbound",
      sender_external_id: "staff",
      body: newMessageBody.trim(),
    });

    setNewMessageBody("");
    setSending(false);
    if (!error) loadMessages();
  };

  const triggerMoMoPrompt = async () => {
    const active = conversations.find(c => c.id === selectedConvId);
    if (!active?.appointment_id) return;

    setTriggeringMoMo(true);
    const providerRef = "TXN-" + Math.floor(1000000 + Math.random() * 9000000);

    // Create payment entry
    await supabase.from("payments").insert({
      appointment_id: active.appointment_id,
      customer_id: active.customer_id,
      provider: "mtn_mobile_money",
      status: "pending",
      amount_ugx: active.appointment.deposit_due_ugx || 62000,
      phone_e164: active.customer?.phone || "+256700123456",
      provider_reference: providerRef,
    });

    // Fire simulated API callback
    setTimeout(async () => {
      await fetch("/api/webhooks/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: providerRef,
          status: "SUCCESSFUL",
          amount: active.appointment.deposit_due_ugx || 62000,
        }),
      });
      loadThreads();
      loadMessages();
      setTriggeringMoMo(false);
    }, 2000);
  };

  const activeConv = conversations.find(c => c.id === selectedConvId);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-ink-light">
        <div className="animate-pulse font-medium">Loading social commerce inbox…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-[88vh]">
      {/* Funnel header cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-white border-brand-100 shadow-sm">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-ink-light uppercase">IG Discovery Taps</span>
              <strong className="block text-2xl font-extrabold text-ink mt-1">156</strong>
            </div>
            <Sparkles className="h-8 w-8 text-brand-500" />
          </CardBody>
        </Card>
        <Card className="bg-white border-brand-100 shadow-sm">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-ink-light uppercase">Active Bot Chats</span>
              <strong className="block text-2xl font-extrabold text-brand-600 mt-1">{stats.botActiveCount}</strong>
            </div>
            <MessageCircle className="h-8 w-8 text-green-500" />
          </CardBody>
        </Card>
        <Card className="bg-white border-brand-100 shadow-sm">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-ink-light uppercase">Confirmed Bookings</span>
              <strong className="block text-2xl font-extrabold text-green-600 mt-1">{stats.completedCount}</strong>
            </div>
            <Check className="h-8 w-8 text-green-600" />
          </CardBody>
        </Card>
      </div>

      {/* Main Multi-Column Social Inbox */}
      <div className="flex-1 flex rounded-2xl border border-brand-100 bg-white overflow-hidden shadow-lg min-h-0">
        {/* Left Column: Threads list */}
        <aside className="w-80 border-r border-brand-100 flex flex-col min-h-0 bg-brand-50/10">
          <div className="p-4 border-b border-brand-100 font-bold text-ink flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-600" /> Active Chats
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-brand-50">
            {conversations.map((c) => {
              const selected = c.id === selectedConvId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={cn(
                    "w-full text-left p-4 transition-colors flex items-start gap-3",
                    selected ? "bg-brand-50" : "hover:bg-brand-50/30"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-brand-200 text-brand-800 font-bold flex items-center justify-center uppercase text-sm">
                    {c.display_name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-semibold text-ink block truncate">{c.display_name}</strong>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                        c.channel === "whatsapp" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"
                      )}>
                        {c.channel}
                      </span>
                    </div>
                    <span className="block text-xs text-ink-light truncate mt-1">{c.snippet}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Middle Column: Chat view */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-brand-100 font-semibold text-ink flex items-center justify-between">
            <span>{activeConv?.display_name || "Conversation"}</span>
            <span className="text-xs text-ink-light">Status: <strong className="text-brand-600 uppercase">{activeConv?.status}</strong></span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-50/20">
            {messages.map((m) => {
              const isInbound = m.direction === "inbound";
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    isInbound
                      ? "bg-white text-ink border border-brand-100 self-start"
                      : "bg-brand-600 text-white self-end"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <span className={cn(
                    "text-[9px] block text-right mt-1",
                    isInbound ? "text-ink-light" : "text-brand-200"
                  )}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Message composer */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-brand-100 flex gap-2">
            <input
              type="text"
              placeholder="Type message or select template…"
              value={newMessageBody}
              onChange={(e) => setNewMessageBody(e.target.value)}
              className="flex-1 rounded-xl border border-brand-100 bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button type="submit" loading={sending} size="md">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </section>

        {/* Right Column: Booking panel context */}
        {activeConv?.appointment && (
          <aside className="w-80 border-l border-brand-100 p-6 flex flex-col gap-6 overflow-y-auto">
            <h3 className="font-bold text-ink text-base">Active Booking Context</h3>
            
            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-brand-50 pb-2">
                <span className="text-ink-light">Status</span>
                <span className="font-bold text-brand-600 uppercase">{activeConv.appointment.status}</span>
              </div>
              <div className="flex justify-between border-b border-brand-50 pb-2">
                <span className="text-ink-light">Subtotal</span>
                <span className="font-semibold text-ink">{formatUGX(activeConv.appointment.total_ugx)}</span>
              </div>
              <div className="flex justify-between border-b border-brand-50 pb-2">
                <span className="text-ink-light">Deposit Due</span>
                <span className="font-semibold text-ink">{formatUGX(activeConv.appointment.deposit_due_ugx)}</span>
              </div>
            </div>

            {activeConv.appointment.status === "pending" && (
              <div className="space-y-3">
                <Button
                  fullWidth
                  variant="primary"
                  loading={triggeringMoMo}
                  onClick={triggerMoMoPrompt}
                  className="flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="h-4 w-4" /> Send MTN Prompt
                </Button>
                <div className="text-[10px] text-center text-ink-light">
                  Will trigger MoMo confirmation prompt and simulation webhooks.
                </div>
              </div>
            )}

            {activeConv.appointment.status === "confirmed" && (
              <div className="rounded-lg bg-green-50 border border-green-100 p-4 text-center text-xs text-green-800 flex flex-col gap-2">
                <Check className="h-8 w-8 text-green-600 mx-auto" />
                <strong>Deposit Confirmed & Confirmed Booking</strong>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
