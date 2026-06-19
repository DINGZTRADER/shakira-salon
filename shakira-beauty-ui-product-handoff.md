# Shakira Beauty and Welness Salon Booking Platform

High-fidelity UI mockup and product handoff for a Uganda-centric beauty salon booking platform.

## Deliverables

- `salon-booking-responsive-mockup.html`: high-fidelity responsive mockup set with mobile and desktop artboards.
- `shakira-beauty-database-schema.sql`: production-ready PostgreSQL database schema.
- `shakira-beauty-openapi.yaml`: production-ready REST API specification.

## Platform Context

The platform is designed for Shakira Beauty and Welness Salon in Kampala, Uganda. The UI emphasizes premium trust, fast service selection, live stylist availability, UGX pricing, and local payment methods.

Primary Uganda-centric decisions:

- Currency: UGX across all service, deposit, and checkout totals.
- Payments: MTN Mobile Money, Airtel Money, Uganda bank transfer, and pay balance at salon.
- Services: Braids, Dreadlocks, Perm, Hair dye, plus add-ons such as retwist, scalp care, and dye gloss.
- Location language: Kampala salon context appears in booking and checkout copy.
- UX priority: quick rebooking, easy rescheduling, and in-app messages with stylist prep notes.

## Screen Set

### 1. Appointment Calendar

Mobile:

- 375x812 app-style layout with service chips, day selector, time slots, live availability hold, service customization, and bottom navigation.
- Primary action: continue to stylist selection.
- Persistent navigation: Book, History, Reschedule, Chat.

Desktop:

- 1440x900 dashboard layout with left navigation, calendar grid, service customization panel, live hold timer, and booking history/rescheduling rails.
- Primary action: continue to stylist selection.

Backend data needed:

- Services and add-ons.
- Stylist availability slots.
- Temporary booking holds.
- Customer preferences.
- Booking history and upcoming appointment records.

### 2. Stylist Profile Cards

Mobile:

- Filter chips for Braids, Dreadlocks, Perm, and Hair dye.
- Cards include stylist name, expertise, availability status, rating context, and portfolio thumbnails.
- Primary actions: book selected stylist and message stylist.

Desktop:

- Three-column stylist comparison cards with portfolio previews, expertise summaries, ratings, and waitlist status.
- Sidebar shows live stylist state and messages.

Backend data needed:

- Stylist profiles.
- Service expertise mappings.
- Ratings and review counts.
- Portfolio media.
- Availability and waitlist state.
- Messaging threads.

### 3. Payment Checkout

Mobile:

- UGX order summary with service line items, deposit due today, visit total, local payment methods, and rescheduling terms.
- Primary action: pay UGX deposit and book.

Desktop:

- Payment method grid plus order summary.
- Uganda payment options include MTN Mobile Money, Airtel Money, Uganda bank transfer, and pay balance at salon.

Backend data needed:

- Booking quote.
- Deposit rules.
- Payment method availability.
- Payment transaction creation/status.
- Booking confirmation after successful payment or pay-at-salon intent.

### 4. Post-Appointment Review

Mobile:

- Stylist card, star rating, review comment field, rebook suggestion, submit review, and booking history action.

Desktop:

- Review form with visit details, suggested next booking window, booking history, upcoming reschedule, and stylist message action.

Backend data needed:

- Completed appointment.
- Review eligibility.
- Review creation.
- Rebook recommendation.
- Message notification state.

## Responsive Behavior

- Mobile uses one focused task per screen with bottom navigation and compact card layouts.
- Desktop uses a persistent sidebar and multi-panel dashboards so users can compare information and act without losing context.
- The same domain objects drive both layouts: services, stylists, availability slots, booking holds, payments, reviews, and messages.
- Critical booking actions remain visible: continue, select stylist, pay, submit review, rebook, and reschedule.

## Suggested Production Frontend Routes

- `/book/calendar`
- `/book/stylist`
- `/book/checkout`
- `/appointments`
- `/appointments/:appointmentId/reschedule`
- `/appointments/:appointmentId/review`
- `/messages`
- `/stylists/:stylistId`

## Implementation Notes

- Use server-generated availability holds with expiry timestamps to avoid double booking.
- Keep all money values as integer minor units in UGX. Because UGX has no decimal minor unit in normal consumer display, store `amount_ugx` as whole shillings.
- Use idempotency keys on booking confirmation and payment creation.
- Persist all reschedule attempts so support staff can audit changes.
- Treat Mobile Money payment status as asynchronous; the UI should show pending, confirmed, failed, or expired states.
- Portfolio media should be served through signed URLs or a CDN-backed asset table.
