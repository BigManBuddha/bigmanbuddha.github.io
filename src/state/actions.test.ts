import { describe, expect, it } from 'vitest';
import { diffDays, parseIso } from '../domain/dates';
import { sampleCaseload } from '../domain/sample';
import { computeClient } from '../domain/caseload';
import { hashPin } from '../services/pin';
import { apply, day, makeClient, makeState, TODAY } from '../test/helpers';
import * as A from './actions';
import type { AppState } from './appState';
import { initialAppState } from './appState';
import { deriveView, weekStats } from './derive';

const seeded = (): AppState => apply(makeState(), A.seedSample(TODAY));
const find = (s: AppState, name: string) => s.clients.find((c) => c.name === name)!;
const messageOf = (s: AppState) => (s.panel?.kind === 'message' ? s.panel.message : null);

describe('startup', () => {
  it('opens unlocked with onboarding on first run', () => {
    const s = initialAppState({ ...makeState(), onboarded: false, pin: null });
    expect(s.locked).toBe(false);
    expect(s.onboardOpen).toBe(true);
    expect(s.templates).toHaveLength(7);
  });

  it('opens locked when a PIN is set', async () => {
    const s = initialAppState({ ...makeState(), pin: await hashPin('2468') });
    expect(s.locked).toBe(true);
  });
});

describe('invite back & release', () => {
  it('Invite back: nothing changes until confirmed', () => {
    let s = seeded();
    const grace = find(s, 'Grace P.');
    s = apply(s, A.inviteBack(s, grace, TODAY));
    expect(messageOf(s)).not.toBeNull();
    s = apply(s, A.closePanel());
    expect(find(s, 'Grace P.').status).toBe('Active');
  });

  it('Invite back + confirm holds the slot with a reply-by lead weeks ahead', () => {
    let s = seeded();
    s = apply(s, A.inviteBack(s, find(s, 'Grace P.'), TODAY));
    s = apply(s, A.confirmPending(s));
    const grace = find(s, 'Grace P.');
    expect(grace.status).toBe('Holding');
    expect(grace.decided).toBe(true);
    expect(diffDays(parseIso(grace.replyBy)!, TODAY)).toBe(14);
    expect(s.panel).toBeNull();
  });

  it('Invite back with lead 0 still gives at least a week to reply', () => {
    let s = seeded();
    s = apply(s, A.updateSettings(s, { lead: '0' }));
    s = apply(s, A.inviteBack(s, find(s, 'Grace P.'), TODAY));
    s = apply(s, A.confirmPending(s));
    expect(diffDays(parseIso(find(s, 'Grace P.').replyBy)!, TODAY)).toBe(7);
  });

  it('Release + confirm discharges the client', () => {
    let s = seeded();
    s = apply(s, A.release(s, find(s, 'Cara M.')));
    s = apply(s, A.confirmPending(s));
    expect(find(s, 'Cara M.').status).toBe('Discharged');
  });

  it('the message is filled with the client, contact and your name', () => {
    let s = seeded();
    s = apply(s, A.updateSettings(s, { yourName: 'Dr Lee' }));
    s = apply(s, A.inviteBack(s, find(s, 'Grace P.'), TODAY));
    const body = messageOf(s)!.body;
    expect(body).toContain('Grace P.');
    expect(body).toContain('Priya (mum)');
    expect(body).toContain('Dr Lee');
    expect(body).not.toContain('[date]');
  });
});

describe('clients & waitlist', () => {
  it('trims the name; a blank name adds nothing; negative lengths become 0', () => {
    let s = makeState();
    s = apply(s, A.saveClient(s, { ...A.newClientDraft(TODAY), name: '   ' }));
    expect(s.clients).toHaveLength(0);
    s = apply(s, A.saveClient(s, { ...A.newClientDraft(TODAY), name: '  Amy B.  ', blockLength: '-4' }));
    expect(s.clients[0].name).toBe('Amy B.');
    expect(s.clients[0].blockLength).toBe(0);
  });

  it('edits then deletes a client', () => {
    let s = makeState();
    s = apply(s, A.saveClient(s, { ...A.newClientDraft(TODAY), name: 'Amy' }));
    const amy = s.clients[0];
    s = apply(s, A.saveClient(s, { ...amy, notes: 'hello' }));
    expect(s.clients).toHaveLength(1);
    expect(s.clients[0].notes).toBe('hello');
    s = apply(s, A.deleteClient(s, amy.id));
    expect(s.clients).toHaveLength(0);
  });

  it('waitlist add / edit / delete', () => {
    let s = makeState();
    s = apply(s, A.saveWait(s, { ...A.newWaitDraft(TODAY), name: 'Family Z' }));
    expect(s.waitlist).toHaveLength(1);
    s = apply(s, A.saveWait(s, { ...s.waitlist[0], notes: 'keen' }));
    expect(s.waitlist[0].notes).toBe('keen');
    s = apply(s, A.deleteWait(s, s.waitlist[0].id));
    expect(s.waitlist).toHaveLength(0);
  });

  it('archive hides discharged clients older than 6 months', () => {
    let s = seeded();
    s = { ...s, clients: [...s.clients, makeClient({ id: 'old', status: 'Discharged', blockStart: day(-400) })] };
    s = apply(s, A.archiveOld(s, TODAY));
    expect(s.clients.find((c) => c.id === 'old')!.archived).toBe(true);
    expect(deriveView(s, TODAY).computed.some((c) => c.id === 'old')).toBe(false);
  });
});

describe('frequencies', () => {
  it('renaming a frequency renames it on clients and waitlist too', () => {
    let s = seeded();
    const weekly = s.clients.filter((c) => c.frequency === 'Weekly').length;
    s = apply(s, A.editFrequency(s, 0, 'name', 'Every week'));
    expect(s.clients.filter((c) => c.frequency === 'Every week')).toHaveLength(weekly);
    expect(s.waitlist.some((w) => w.need === 'Every week')).toBe(true);
  });

  it('a frequency in use cannot be removed; an unused one can', () => {
    const s = seeded();
    expect(A.frequencyRemovalProblem(s, 0)).not.toBe('');
    const fresh = makeState();
    const last = fresh.settings.frequencies.length - 1;
    expect(A.frequencyRemovalProblem(fresh, last)).toBe('');
    expect(apply(fresh, A.removeFrequency(fresh, last)).settings.frequencies).toHaveLength(last);
  });
});

describe('templates', () => {
  it('editing, adding and deleting templates', () => {
    let s = makeState();
    s = apply(s, A.addTemplate(s));
    const added = s.templates[s.templates.length - 1];
    s = apply(s, A.editTemplate(s, added.id, 'body', 'Hello [Client]'));
    expect(s.templates.find((t) => t.id === added.id)!.body).toBe('Hello [Client]');
    s = apply(s, A.deleteTemplate(s, added.id));
    expect(s.templates).toHaveLength(7);
  });
});

describe('data', () => {
  it('importing a backup replaces clients', () => {
    let s = seeded();
    s = apply(s, A.applyBackup({ clients: [makeClient({ name: 'Only one' })], waitlist: [] }));
    expect(s.clients).toHaveLength(1);
    expect(s.waitlist).toHaveLength(0);
  });

  it('delete all resets clients, settings and PIN', async () => {
    let s = seeded();
    s = apply(s, A.updateSettings(s, { yourName: 'Dr Lee', target: 3 }), { pin: await hashPin('1234') });
    s = apply(s, A.resetAll());
    expect(s.clients).toHaveLength(0);
    expect(s.settings.yourName).toBe('');
    expect(s.settings.target).toBe(8);
    expect(s.pin).toBeNull();
  });
});

describe('lock & review', () => {
  it('Lock now closes open panels and the review', () => {
    let s = apply(makeState(), { panel: { kind: 'client', client: null }, reviewStep: 1 });
    s = apply(s, A.lock());
    expect(s.locked).toBe(true);
    expect(s.panel).toBeNull();
    expect(s.reviewStep).toBeNull();
  });

  it('the weekly review steps forward and closes after the last step', () => {
    let s = apply(makeState(), A.startReview());
    for (let i = 0; i < 3; i++) s = apply(s, A.reviewNext(s));
    expect(s.reviewStep).toBe(3);
    s = apply(s, A.reviewNext(s));
    expect(s.reviewStep).toBeNull();
  });
});

describe('derived figures', () => {
  it('This week figures for the sample caseload', () => {
    const d = deriveView(seeded(), TODAY);
    expect(d.urgent.length).toBeGreaterThan(0);
    expect(d.badges.week).toBe(d.urgent.length);
    const stats = weekStats(d);
    expect(stats.map((x) => x.label)).toEqual(['Slots used', 'Safe to offer', 'Act now', 'Awaiting reply', 'Waitlist due']);
    expect(stats[2].tone).toBe('red');
  });

  it('every sample client computes without error', () => {
    const s = seeded();
    for (const c of sampleCaseload(TODAY).clients) expect(() => computeClient(c, s.settings, TODAY)).not.toThrow();
  });
});
