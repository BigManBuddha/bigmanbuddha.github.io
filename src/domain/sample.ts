/**
 * Demo caseload for first run and tutorials. Dates are offsets from this
 * week's Monday, so the demo always looks current.
 */
import { REBOOK } from './constants';
import { addDays, mondayOf, toIso } from './dates';
import { newId } from './format';
import type { Client, Status, WaitlistEntry } from './types';

export function sampleCaseload(today: Date): { clients: Client[]; waitlist: WaitlistEntry[] } {
  const monday = mondayOf(today);
  const day = (offset: number) => toIso(addDays(monday, offset));

  const client = (
    name: string, contact: string, frequency: string, startOffset: number, blockLength: number,
    status: Status, replyOffset: number | null, rebook: string, notes: string,
  ): Client => ({
    id: newId('c'), name, contact, frequency,
    blockStart: day(startOffset), blockLength, pushedBack: 0, status,
    replyBy: replyOffset === null ? '' : day(replyOffset),
    rebook, decided: false, notes,
  });

  const clients: Client[] = [
    // Block ended
    client('Grace P.', 'Priya (mum)', 'Weekly', -42, 6, 'Active', null, REBOOK.CONTINUE, 'Block finished — really strong progress, worth continuing'),
    client('Finn O.', 'Mark (dad)', 'Weekly', -49, 8, 'Active', null, REBOOK.FINISH, 'Goals largely met — likely to close and free the slot'),
    // Holding: one overdue (chase), one still waiting
    client('Cara M.', 'Nadia (mum)', 'Weekly', -70, 6, 'Holding', -5, '', 'Invited back 2 weeks ago — no reply yet'),
    client('Noah W.', 'Tom (dad)', 'Weekly', -56, 6, 'Holding', 6, '', 'Invited back — holding the slot until they reply'),
    // Decide now
    client('Ivy L.', 'Sofia (mum)', 'Weekly', -21, 6, 'Active', null, REBOOK.FINISH, 'Winding down — probably the last block'),
    client('Kira D.', 'Aisha (mum)', 'Fortnightly', -42, 5, 'Active', null, REBOOK.FINISH, 'Nearly discharged'),
    // Review soon
    client('Jack B.', 'Ellie (mum)', 'Weekly', -14, 7, 'Active', null, REBOOK.CONTINUE, 'Going well — will offer another block'),
    // On track
    client('Alice R.', 'Hannah (mum)', 'Weekly', -35, 12, 'Active', null, REBOOK.CONTINUE, 'Going well'),
    client('Dan H.', 'Chris (dad)', 'Weekly', -7, 10, 'Active', null, '', 'Settling in nicely'),
    client('Ben T.', 'Laura (mum)', 'Fortnightly', -28, 6, 'Active', null, REBOOK.CONTINUE, ''),
    client('Eve S.', 'Grace (mum)', 'Monthly', -7, 4, 'Active', null, REBOOK.CONTINUE, 'Maintenance phase'),
    client('Omar F.', 'Yusuf (dad)', 'Every 3 weeks', -21, 5, 'Active', null, REBOOK.CONTINUE, 'Consolidation block'),
    client('Leah S.', 'Ruth (mum)', 'One-off', -3, 1, 'Active', null, REBOOK.FINISH, 'One-off advice session — no follow-up needed'),
    // Discharged
    client('Sam K.', 'Beth (mum)', 'Weekly', -119, 8, 'Discharged', null, '', 'Discharged in the spring — goals met'),
  ];

  const waiting = (name: string, need: string, addedOffset: number, contactedOffset: number, notes: string): WaitlistEntry => ({
    id: newId('w'), name, need, added: day(addedOffset), lastContacted: day(contactedOffset), notes,
  });

  const waitlist: WaitlistEntry[] = [
    waiting('The Okafor family', 'Weekly', -30, -16, 'Keen for a weekly slot as soon as one opens'),
    waiting('Family H', 'Fortnightly', -40, -25, 'Overdue a check-in'),
    waiting('Family G', 'Weekly', -20, -5, 'Offered a slot next month'),
    waiting('Baby Rowan', 'Monthly', -10, -3, 'Early days — happy to wait'),
  ];

  return { clients, waitlist };
}
