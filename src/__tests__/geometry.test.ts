import { describe, expect, it } from 'vitest';
import { rectsIntersect } from '../model/geometry';

describe('rectsIntersect', () => {
  const trash = { x: 100, y: 100, width: 50, height: 50 };

  it('detects partial overlap', () => {
    expect(rectsIntersect({ x: 0, y: 0, width: 110, height: 110 }, trash)).toBe(true);
    expect(rectsIntersect({ x: 140, y: 140, width: 200, height: 200 }, trash)).toBe(true);
  });

  it('detects full containment either way', () => {
    expect(rectsIntersect({ x: 110, y: 110, width: 10, height: 10 }, trash)).toBe(true);
    expect(rectsIntersect({ x: 0, y: 0, width: 500, height: 500 }, trash)).toBe(true);
  });

  it('ignores separate or merely touching rects', () => {
    expect(rectsIntersect({ x: 0, y: 0, width: 100, height: 100 }, trash)).toBe(false);
    expect(rectsIntersect({ x: 200, y: 0, width: 50, height: 300 }, trash)).toBe(false);
  });
});
