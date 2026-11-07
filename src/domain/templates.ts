/**
 * Message templates. Placeholders: [Client] [Contact name] [date] [Your name].
 * Each built-in template has a role that links it to a one-click action.
 */
import { ROLE } from './constants';
import { fmtLong, parseIso } from './dates';
import type { Role, Template } from './types';

const BUILTIN_TEMPLATES: { role: Role; title: string; body: string }[] = [
  { role: ROLE.INVITE, title: '1. End of block — invitation to continue', body:
"Hi [Contact name],\n\nIt's been a real pleasure working with [Client] over the last few weeks, and they've made lovely progress — particularly with [specific goal].\n\nWe've now reached the end of this block of sessions. I'd be very happy to continue with another block to build on where we've got to, if you'd like to.\n\nI want to be upfront that my availability is limited and spaces do fill up quickly. I'd love to keep [Client]'s usual slot, so if you'd like to carry on, just let me know by [date] and I'll hold the place. If the timing isn't right just now, that's absolutely fine — do stay in touch and I'll always do my best to fit you back in.\n\nWarm wishes,\n[Your name]" },
  { role: ROLE.CHASE, title: '2. Friendly chase — reply-by approaching', body:
"Hi [Contact name],\n\nJust a quick note following my last message about continuing [Client]'s sessions — no pressure at all, I know how busy things get! I'm holding the slot for now, but I'll need to confirm my schedule by [date], so I wanted to check whether you'd like to carry on with another block.\n\nA quick yes or no is all I need and I'll take care of the rest.\n\nWarm wishes,\n[Your name]" },
  { role: ROLE.RELEASE, title: '3. Releasing the slot — kind close', body:
"Hi [Contact name],\n\nI haven't heard back, so I'll assume the timing isn't quite right at the moment — which is completely fine. I'll free up [Client]'s slot for now, but please don't hesitate to get in touch whenever you'd like to pick things back up, and I'll do my very best to find a space.\n\nIt's been a pleasure working with [Client], and I wish you all the best.\n\nWarm wishes,\n[Your name]" },
  { role: ROLE.WAIT_WARM, title: '4. Waitlist — keeping warm', body:
"Hi [Contact name],\n\nJust a quick message to let you know [Client] is still on my waiting list and very much in my thoughts — you haven't been forgotten. I don't have a suitable space just yet, but as soon as one comes up that fits, I'll be in touch straight away. Thank you so much for your patience.\n\nWarm wishes,\n[Your name]" },
  { role: ROLE.WAIT_OFFER, title: '5. Waitlist — a space has come up', body:
"Hi [Contact name],\n\nGood news — a space has become available that I think would suit [Client] well: [day / time / frequency]. I'd love to offer it to you. Spaces like this don't tend to stay open long, so if you'd like to take it, please let me know by [date] and I'll book you straight in.\n\nWarm wishes,\n[Your name]" },
];

const EXTRA_TEMPLATES: Template[] = [
  { id: 't_welcome', role: ROLE.CUSTOM, title: 'New client — welcome & first session', body:
"Hi [Contact name],\n\nLovely to have [Client] booked in — I'm really looking forward to getting started. Our first session is [day / time], and there's nothing you need to prepare; just come as you are.\n\nIf anything changes before then, or you have any questions, do get in touch. See you soon!\n\nWarm wishes,\n[Your name]" },
  { id: 't_reminder', role: ROLE.CUSTOM, title: 'Session reminder', body:
"Hi [Contact name],\n\nJust a friendly reminder that [Client]'s next session is [day / time]. Looking forward to seeing you — let me know if anything's changed.\n\nWarm wishes,\n[Your name]" },
];

/** Fresh copies of the default templates. */
export function defaultTemplates(): Template[] {
  const core = BUILTIN_TEMPLATES.map((t) => ({ id: `t_${t.role}`, ...t }));
  return [...core, ...EXTRA_TEMPLATES.map((t) => ({ ...t }))];
}

/** The user's template for a role, falling back to the built-in wording. */
export function templateForRole(templates: Template[], role: Role): Template {
  return templates.find((t) => t.role === role) ?? defaultTemplates().find((t) => t.role === role)!;
}

/** "1. End of block — …" → "End of block — …" */
export function stripNumbering(title: string): string {
  return (title || 'Template').replace(/^\d+\.\s*/, '');
}

export interface Recipient { name?: string; contact?: string; replyBy?: string }

/** Swap placeholders for real values. Unknown values keep their [bracket] so they're easy to spot. */
export function fillTemplate(body: string, recipient: Recipient | null, yourName: string): string {
  const values: Record<string, string> = {
    '[Client]': recipient?.name || '[Client]',
    '[Contact name]': recipient?.contact || '[Contact name]',
    '[date]': recipient?.replyBy ? fmtLong(parseIso(recipient.replyBy)) : '[date]',
    '[Your name]': yourName || '[Your name]',
  };
  return Object.entries(values).reduce((text, [key, value]) => text.split(key).join(value), body || '');
}

/** Give `role` to template `id`. A role belongs to one template at a time. */
export function assignTemplateRole(templates: Template[], id: string, role: Role): Template[] {
  return templates.map((t) => {
    if (t.id === id) return { ...t, role };
    if (role !== ROLE.CUSTOM && t.role === role) return { ...t, role: ROLE.CUSTOM };
    return t;
  });
}
