import { describe, expect, it } from 'vitest';
import { layoutFor } from './layout';

describe('layoutFor', () => {
  it('phone under 700px, rail on tablets, full sidebar on desktop', () => {
    expect(layoutFor(390, null)).toBe('phone');
    expect(layoutFor(390, 'full')).toBe('phone'); // phones never show the sidebar
    expect(layoutFor(820, null)).toBe('rail');
    expect(layoutFor(820, 'full')).toBe('full');
    expect(layoutFor(1440, null)).toBe('full');
    expect(layoutFor(1440, 'rail')).toBe('rail');
  });
});
