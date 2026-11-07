import { describe, expect, it } from 'vitest';
import { assignTemplateRole, defaultTemplates, fillTemplate, stripNumbering, templateForRole } from './templates';
import type { Template } from './types';

describe('templates', () => {
  it('fillTemplate replaces every placeholder, every time it appears', () => {
    const out = fillTemplate('[Client] [Client] [Contact name] [date] [Your name]', { name: 'Amy', contact: 'Jo', replyBy: '2026-11-11' }, 'Sam');
    expect(out).toBe('Amy Amy Jo Wednesday 11 November Sam');
  });

  it('fillTemplate keeps [brackets] for anything unknown', () => {
    expect(fillTemplate('[Client] [Contact name] [date] [Your name]', null, '')).toBe('[Client] [Contact name] [date] [Your name]');
  });

  it('templateForRole falls back to built-in wording if the user deleted theirs', () => {
    const t = templateForRole([], 'chase');
    expect(t.role).toBe('chase');
    expect(t.body.length).toBeGreaterThan(50);
  });

  it('a role belongs to one template at a time', () => {
    const list: Template[] = [{ id: 'a', role: 'invite', title: '', body: '' }, { id: 'b', role: 'custom', title: '', body: '' }];
    expect(assignTemplateRole(list, 'b', 'invite').map((t) => t.role)).toEqual(['custom', 'invite']);
  });

  it('defaultTemplates returns fresh copies each time', () => {
    const a = defaultTemplates();
    a[0].body = 'changed';
    expect(defaultTemplates()[0].body).not.toBe('changed');
    expect(a).toHaveLength(7);
  });

  it('stripNumbering removes "1. " prefixes', () => {
    expect(stripNumbering('1. End of block')).toBe('End of block');
    expect(stripNumbering('')).toBe('Template');
  });
});
