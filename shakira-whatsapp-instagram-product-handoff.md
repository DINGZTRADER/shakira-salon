# Shakira Beauty WhatsApp + Instagram Booking Platform

This version removes the need for customers to install or use a standalone booking app. Instagram becomes the discovery and portfolio surface; WhatsApp becomes the booking, payment, review, rebook, and rescheduling surface.

## Customer Flow

1. Customer discovers Shakira Beauty and Welness Salon on Instagram.
2. Customer views highlights for Braids, Dreadlocks, Perm, and Hair dye.
3. Customer taps WhatsApp Book from Instagram profile, post, story, ad, or DM.
4. WhatsApp bot asks for service, preferred day/time, stylist preference, and payment method.
5. Platform creates a temporary appointment hold.
6. Customer pays UGX deposit through MTN Mobile Money, Airtel Money, Uganda bank transfer, or chooses pay balance at salon.
7. WhatsApp sends confirmation, directions, reminders, rescheduling options, and stylist messages.
8. After the appointment, WhatsApp asks for a star review and offers rebooking.
9. With customer permission, review or hairstyle photo can be reused on Instagram.

## Staff Flow

Staff use a desktop social commerce inbox:

- Instagram leads: profile taps, story replies, ad comments, DMs, and service interest.
- WhatsApp inbox: live booking conversations, bot handoff, payment reminders, and stylist prep notes.
- Bookings: confirmed appointments, pending deposits, reschedules, no-shows, completed services.
- Payments: MTN Mobile Money, Airtel Money, bank transfers, and cash-at-salon status.
- Reviews: WhatsApp review requests, Instagram repost permission, rating trends.

## UI Screens Included

- Instagram discovery and portfolio screen.
- Desktop Instagram lead funnel dashboard.
- WhatsApp booking chat screen.
- Desktop WhatsApp booking inbox.
- WhatsApp payment/review/rebook screen.
- Desktop booking and automation dashboard.

## Data Changes From Standalone App

The core booking tables still matter, but the platform needs channel-aware records:

- Social accounts for Instagram and WhatsApp Business numbers.
- Conversations and messages linked to customer profiles.
- Channel attribution from Instagram to WhatsApp.
- Bot state for partially completed booking flows.
- Message templates for WhatsApp confirmations, reminders, payments, reviews, and rebooking.
- Consent fields for marketing, WhatsApp notifications, and Instagram repost permission.

## Recommended Integrations

- WhatsApp Business Platform or a provider such as Twilio, Infobip, Africa's Talking, or Meta Cloud API.
- Instagram Graph API for business profile media, comments, mentions, DMs, and click attribution where available.
- MTN Mobile Money and Airtel Money payment providers for Uganda.
- Staff dashboard built as a web app with role-based permissions.

## Production Notes

- Keep appointment holds server-side and expire them automatically.
- Do not rely on WhatsApp message order alone for booking state; persist each booking session.
- Use idempotency keys when converting a WhatsApp conversation into a booking or payment.
- Store UGX values as integer shillings.
- Use approved WhatsApp message templates for outbound reminders and payment prompts.
- Log user consent before sending marketing broadcasts.
