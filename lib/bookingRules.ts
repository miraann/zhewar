// Server-side check that a requested appointment time is one the booking
// calendar (components/booking/DateTimePicker.tsx) could have offered: not in
// the past, inside its 14-day window, on a working day, and exactly on one of
// that day's slots. Times are compared in the shop's time zone, which is the
// one customers' phones build the slots in.
//
// Blocked dates aren't checked here: DateTimePicker matches them with
// toISOString(), which turns local midnight into the previous UTC day, so a
// server check on the real date would disagree with what the calendar shows.
//
// No imports, so it can be tested with plain `node`.

export const SHOP_TIME_ZONE = process.env.SHOP_TIMEZONE || 'Asia/Baghdad';
// DateTimePicker offers today + 13 days; one more day of slack for clock skew
const MAX_DAYS_AHEAD = 14;
// A slot picked just before it started can still be confirmed a bit after
const PAST_GRACE_MS = 10 * 60 * 1000;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface ScheduleDay {
  day_of_week:   number;
  is_active:     boolean;
  start_time:    string;
  end_time:      string;
  slot_interval: number;
}

export type SlotProblem = 'past' | 'too_far' | 'closed' | 'not_a_slot';

// Same slots as DateTimePicker's generateSlots ("HH:MM", end exclusive)
export function generateSlots(startTime: string, endTime: string, intervalMins: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const slots: string[] = [];
  if (!(intervalMins > 0)) return slots;
  for (let m = sh * 60 + sm; m < eh * 60 + em; m += intervalMins)
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return slots;
}

// An ISO 8601 timestamp with a zone, as BookingFlow sends (toISOString())
export function parseAppointmentTime(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !ISO_RE.test(raw)) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms);
}

function shopLocal(d: Date) {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: SHOP_TIME_ZONE, hourCycle: 'h23',
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d)) parts[p.type] = p.value;

  return {
    dayOfWeek: WEEKDAYS.indexOf(parts.weekday),
    // The shop-local calendar date, as a day count
    dayNumber: Date.UTC(+parts.year, +parts.month - 1, +parts.day) / 86400000,
    time:      `${parts.hour}:${parts.minute}`,
    second:    +parts.second,
  };
}

// null when `when` is a bookable slot, otherwise what's wrong with it
export function checkSlot(when: Date, schedule: ScheduleDay[], now: Date = new Date()): SlotProblem | null {
  if (when.getTime() < now.getTime() - PAST_GRACE_MS) return 'past';
  const at = shopLocal(when);
  if (at.dayNumber - shopLocal(now).dayNumber > MAX_DAYS_AHEAD) return 'too_far';
  const day = schedule.find((s) => s.day_of_week === at.dayOfWeek);
  if (!day?.is_active) return 'closed';
  const slots = generateSlots(day.start_time, day.end_time, day.slot_interval);
  if (at.second !== 0 || !slots.includes(at.time)) return 'not_a_slot';
  return null;
}
