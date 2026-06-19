// =============================================================
// Shared TypeScript types (mirror DB schema + backward compat)
// =============================================================

export type UserRole = "customer" | "stylist" | "manager" | "admin";

export type AppointmentStatus =
  | "draft"
  | "held"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "rescheduled"
  | "no_show";

export type PaymentStatus =
  | "pending"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "expired"
  | "refunded"
  | "paid"; // backward compatibility

export type PaymentProvider =
  | "mtn_mobile_money"
  | "airtel_money"
  | "bank_transfer"
  | "cash_at_salon";

// Backward compatibility PaymentMethod
export type PaymentMethod = "mtn_momo" | "airtel_money";

export type HoldStatus = "active" | "converted" | "expired" | "released";
export type MessageSenderType = "customer" | "stylist" | "system";
export type RescheduleStatus = "requested" | "accepted" | "declined" | "cancelled";
export type MediaKind = "image" | "video";
export type SocialChannel = "whatsapp" | "instagram";
export type ConversationStatus = "open" | "bot_active" | "staff_active" | "booked" | "closed" | "spam";
export type MessageDirection = "inbound" | "outbound";
export type TemplateKind =
  | "booking_confirmation"
  | "payment_prompt"
  | "appointment_reminder"
  | "review_request"
  | "rebook_prompt"
  | "marketing_broadcast";
export type LeadStatus = "new" | "qualified" | "whatsapp_opened" | "hold_created" | "booked" | "lost";

export type User = {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string;
  avatar_url: string | null;
  marketing_opt_in: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Branch = {
  id: string;
  name: string;
  slug: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  country_code: string;
  timezone: string;
  phone_e164: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerProfile = {
  user_id: string;
  preferred_branch_id: string | null;
  preferred_payment_provider: PaymentProvider | null;
  quiet_chair_preference: boolean;
  hair_notes: string | null;
  allergy_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StylistProfile = {
  user_id: string;
  branch_id: string;
  display_name: string;
  bio: string | null;
  years_experience: number;
  rating_average: number;
  rating_count: number;
  is_bookable: boolean;
  created_at: string;
  updated_at: string;
};

// Backward compatibility Staff type
export type Staff = {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceCategory = {
  id: string;
  name: string;
  sort_order: number;
};

export type Service = {
  id: string;
  category_id?: string;
  name: string;
  slug?: string;
  description: string | null;
  duration_minutes: number;
  base_price_ugx?: number;
  deposit_price_ugx?: number;
  is_add_on?: boolean;
  is_active: boolean;
  price: number; // backward compatibility (maps to price or base_price_ugx)
  created_at: string;
  updated_at: string;
};

export type StylistService = {
  stylist_id: string;
  service_id: string;
  custom_duration_minutes: number | null;
  custom_price_ugx: number | null;
};

export type StylistPortfolioMedia = {
  id: string;
  stylist_id: string;
  service_id: string | null;
  kind: MediaKind;
  url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

export type BookingHold = {
  id: string;
  customer_id: string;
  stylist_id: string;
  branch_id: string;
  starts_at: string;
  ends_at: string;
  status: HoldStatus;
  expires_at: string;
  idempotency_key: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  customer_id: string;
  stylist_id: string | null; // nullable for backward compatibility
  staff_id?: string | null; // backward compatibility
  branch_id?: string;
  hold_id: string | null;
  status: AppointmentStatus;
  starts_at?: string;
  ends_at?: string;
  appointment_date: string; // YYYY-MM-DD (backward compatibility)
  appointment_time: string; // HH:MM:SS (backward compatibility)
  subtotal_ugx?: number;
  deposit_due_ugx?: number;
  total_ugx?: number;
  customer_notes?: string | null;
  stylist_notes?: string | null;
  notes: string | null; // backward compatibility
  quiet_chair?: boolean;
  cancellation_reason?: string | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
};

// Relation wrappers
export type AppointmentWithRelations = Appointment & {
  service?: Service; 
  services?: Service[];
  stylist?: StylistProfile & { user?: User };
  staff?: Staff | null; // backward compatibility
  customer?: User;
  branch?: Branch;
};

export type AppointmentService = {
  id: string;
  appointment_id: string;
  service_id: string;
  name_snapshot: string;
  duration_minutes: number;
  price_ugx: number;
  sort_order: number;
};

export type Payment = {
  id: string;
  appointment_id: string;
  customer_id?: string;
  amount?: number; // backward compatibility
  amount_ugx: number;
  method?: PaymentMethod; // backward compatibility
  provider?: PaymentProvider;
  status: PaymentStatus;
  phone_number?: string; // backward compatibility
  phone_e164?: string | null;
  provider_reference?: string | null;
  reference?: string | null; // backward compatibility
  provider_status_payload?: Record<string, unknown>;
  idempotency_key?: string | null;
  requested_at?: string;
  succeeded_at?: string | null;
  failed_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type Review = {
  id: string;
  appointment_id: string;
  customer_id: string;
  stylist_id: string;
  rating: number;
  comment: string | null;
  photo_permission: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type RescheduleRequest = {
  id: string;
  appointment_id: string;
  requested_by_user_id: string;
  current_starts_at: string;
  current_ends_at: string;
  requested_starts_at: string;
  requested_ends_at: string;
  status: RescheduleStatus;
  reason: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

// Social Commerce types
export type SocialAccount = {
  id: string;
  branch_id: string;
  channel: SocialChannel;
  display_name: string;
  handle: string;
  external_account_id: string | null;
  access_token_secret_ref: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SocialLead = {
  id: string;
  account_id: string;
  customer_id: string | null;
  channel: SocialChannel;
  status: LeadStatus;
  source: string;
  source_external_id: string | null;
  service_interest: string | null;
  attribution: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
};

export type SocialConversation = {
  id: string;
  account_id: string;
  customer_id: string | null;
  appointment_id: string | null;
  lead_id: string | null;
  channel: SocialChannel;
  external_thread_id: string;
  status: ConversationStatus;
  assigned_user_id: string | null;
  bot_state: Record<string, unknown>;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialMessage = {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender_external_id: string | null;
  external_message_id: string | null;
  body: string | null;
  media_urls: string[];
  payload: Record<string, unknown>;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};

export type WhatsAppTemplate = {
  id: string;
  account_id: string;
  kind: TemplateKind;
  template_name: string;
  locale: string;
  body: string;
  approved_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type SocialConsentEvent = {
  id: string;
  customer_id: string;
  channel: SocialChannel;
  consent_type: string;
  granted: boolean;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type InstagramMediaPost = {
  id: string;
  account_id: string;
  service_id: string | null;
  external_media_id: string;
  media_url: string;
  permalink: string | null;
  caption: string | null;
  like_count: number;
  comment_count: number;
  posted_at: string | null;
  created_at: string;
};

// Database type (used by typed client)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<Omit<User, "created_at" | "updated_at">> & Pick<User, "phone" | "full_name">;
        Update: Partial<User>;
        Relationships: [];
      };
      services: {
        Row: Service;
        Insert: Partial<Omit<Service, "id" | "created_at" | "updated_at">> & Pick<Service, "name" | "price" | "is_active">;
        Update: Partial<Service>;
        Relationships: [];
      };
      staff: {
        Row: Staff;
        Insert: Omit<Staff, "id" | "created_at" | "updated_at">;
        Update: Partial<Staff>;
        Relationships: [];
      };
      branches: {
        Row: Branch;
        Insert: Partial<Omit<Branch, "id" | "created_at" | "updated_at">> & Pick<Branch, "name" | "slug" | "address_line_1" | "city">;
        Update: Partial<Branch>;
        Relationships: [];
      };
      stylist_profiles: {
        Row: StylistProfile;
        Insert: Partial<Omit<StylistProfile, "created_at" | "updated_at">> & Pick<StylistProfile, "user_id" | "branch_id" | "display_name">;
        Update: Partial<StylistProfile>;
        Relationships: [];
      };
      booking_holds: {
        Row: BookingHold;
        Insert: Partial<Omit<BookingHold, "id" | "created_at">> & Pick<BookingHold, "customer_id" | "stylist_id" | "branch_id" | "starts_at" | "ends_at" | "expires_at">;
        Update: Partial<BookingHold>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Partial<Omit<Appointment, "id" | "created_at" | "updated_at" | "appointment_date" | "appointment_time" | "notes">> & Pick<Appointment, "customer_id"> & { appointment_date?: string; appointment_time?: string; notes?: string | null; };
        Update: Partial<Appointment>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Omit<Payment, "id" | "created_at" | "updated_at">> & Pick<Payment, "appointment_id" | "amount_ugx">;
        Update: Partial<Payment>;
        Relationships: [];
      };
      reviews: {
        Row: Review;
        Insert: Partial<Omit<Review, "id" | "created_at" | "updated_at">> & Pick<Review, "appointment_id" | "customer_id" | "stylist_id" | "rating">;
        Update: Partial<Review>;
        Relationships: [];
      };
      social_conversations: {
        Row: SocialConversation;
        Insert: Partial<Omit<SocialConversation, "id" | "created_at" | "updated_at">> & Pick<SocialConversation, "account_id" | "channel" | "external_thread_id">;
        Update: Partial<SocialConversation>;
        Relationships: [];
      };
      social_messages: {
        Row: SocialMessage;
        Insert: Partial<Omit<SocialMessage, "id" | "created_at">> & Pick<SocialMessage, "conversation_id" | "direction">;
        Update: Partial<SocialMessage>;
        Relationships: [];
      };
      social_accounts: {
        Row: SocialAccount;
        Insert: Partial<Omit<SocialAccount, "id" | "created_at" | "updated_at">> & Pick<SocialAccount, "branch_id" | "channel" | "display_name" | "handle">;
        Update: Partial<SocialAccount>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      appointment_status: AppointmentStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
