-- Social-channel addendum for Shakira Beauty and Welness Salon
-- Adds WhatsApp + Instagram commerce tables on top of shakira-beauty-database-schema.sql

CREATE TYPE social_channel AS ENUM ('whatsapp', 'instagram');
CREATE TYPE conversation_status AS ENUM ('open', 'bot_active', 'staff_active', 'booked', 'closed', 'spam');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE template_kind AS ENUM ('booking_confirmation', 'payment_prompt', 'appointment_reminder', 'review_request', 'rebook_prompt', 'marketing_broadcast');
CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'whatsapp_opened', 'hold_created', 'booked', 'lost');

CREATE TABLE social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  channel social_channel NOT NULL,
  display_name text NOT NULL,
  handle text NOT NULL,
  external_account_id text,
  access_token_secret_ref text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, handle)
);

CREATE TABLE social_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  channel social_channel NOT NULL,
  status lead_status NOT NULL DEFAULT 'new',
  source text NOT NULL,
  source_external_id text,
  service_interest text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX social_leads_status_idx ON social_leads(status, last_seen_at DESC);

CREATE TABLE social_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES social_leads(id) ON DELETE SET NULL,
  channel social_channel NOT NULL,
  external_thread_id text NOT NULL,
  status conversation_status NOT NULL DEFAULT 'bot_active',
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  bot_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_thread_id)
);

CREATE INDEX social_conversations_status_idx ON social_conversations(channel, status, last_message_at DESC);

CREATE TABLE social_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES social_conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  sender_external_id text,
  external_message_id text,
  body text,
  media_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, external_message_id)
);

CREATE INDEX social_messages_conversation_idx ON social_messages(conversation_id, created_at);

CREATE TABLE whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  kind template_kind NOT NULL,
  template_name text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  body text NOT NULL,
  approved_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, template_name, locale)
);

CREATE TABLE social_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel social_channel NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL,
  source text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX social_consent_customer_idx ON social_consent_events(customer_id, created_at DESC);

CREATE TABLE instagram_media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  external_media_id text NOT NULL,
  media_url text NOT NULL,
  permalink text,
  caption text,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, external_media_id)
);
