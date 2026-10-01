import type { WhatsAppTemplate, WhatsAppTemplateKind } from './types';

// Convert Iraqi local number (07XX…) to WhatsApp international format (964 7XX…)
export function toWaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0'))   return '964' + digits.slice(1);
  return digits;
}

// `text`, when given, opens the chat with that message already typed in —
// the admin still presses Send inside WhatsApp.
export function waLink(phone: string, text?: string): string {
  const base = `https://wa.me/${toWaNumber(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// ── Message templates (whatsapp_templates) ───────────────────────────────────

export const WA_KIND_LABEL: Record<WhatsAppTemplateKind, string> = {
  accept:  'پەسەندکردن',
  decline: 'هەڵوەشاندن',
};

// Same limits as the check constraints on whatsapp_templates.
export const WA_TITLE_MAX = 80;
export const WA_BODY_MAX  = 1000;

// Placeholders a template body can use. The editor shows them as
// tap-to-insert chips; fillWaTemplate swaps each for the booking's value.
export const WA_TOKENS = [
  { token: '{name}', label: 'ناوی کڕیار'     },
  { token: '{date}', label: 'ڕۆژ و بەروار'   },
  { token: '{time}', label: 'کات'            },
  { token: '{link}', label: 'لینکی پسوولە'   },
  { token: '{book}', label: 'لینکی تۆمارکردن' },
] as const;

export const WA_TOKEN_RE = /\{(?:name|date|time|link|book)\}/g;

export interface WaMessageValues {
  name: string;
  date: string;
  time: string;
  link: string;
  book: string;
}

export function fillWaTemplate(body: string, values: WaMessageValues): string {
  return body.replace(WA_TOKEN_RE, (token) => values[token.slice(1, -1) as keyof WaMessageValues]);
}

// Within each kind, the first template in this order is the default one the
// send sheet preselects.
export function byTemplateOrder(a: WhatsAppTemplate, b: WhatsAppTemplate): number {
  return a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
}

// Validates a create/update request body for the admin API routes.
export function parseTemplateFields(raw: unknown): Pick<WhatsAppTemplate, 'kind' | 'title' | 'body'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const { kind, title, body } = raw as Record<string, unknown>;
  if (kind !== 'accept' && kind !== 'decline') return null;
  if (typeof title !== 'string' || typeof body !== 'string') return null;
  const t = title.trim().slice(0, WA_TITLE_MAX);
  const b = body.replace(/\r\n/g, '\n').trim().slice(0, WA_BODY_MAX);
  if (!t || !b) return null;
  return { kind, title: t, body: b };
}
