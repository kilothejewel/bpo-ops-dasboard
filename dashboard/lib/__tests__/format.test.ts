import { describe, expect, it } from 'vitest';
import { computeDelta, getPageNumbers, meanOf } from '@/lib/format';

describe('computeDelta', () => {
  it('reports percentage-point change and judges direction', () => {
    expect(computeDelta(89.66, 92.81, 'points', { higherIsBetter: true })).toEqual({
      value: -3.15,
      direction: 'down',
      isGood: false,
      label: '-3.15 pts',
    });
  });

  it('treats a fall as good when lower is better', () => {
    expect(computeDelta(22.39, 22.84, 'absolute', { higherIsBetter: false, unit: 'min' })).toMatchObject({
      direction: 'down',
      isGood: true,
      label: '-0.45 min',
    });
  });

  it('computes relative change with no judgment when no direction is better', () => {
    expect(computeDelta(378, 400, 'percent')).toEqual({ value: -5.5, direction: 'down', isGood: null, label: '-5.5%' });
  });

  it('is flat and neutral for no change', () => {
    expect(computeDelta(50, 50, 'points', { higherIsBetter: true })).toMatchObject({ direction: 'flat', isGood: null, label: '0.00 pts' });
  });

  it('returns null for missing data or divide-by-zero', () => {
    expect(computeDelta(null, 1, 'points')).toBeNull();
    expect(computeDelta(1, null, 'points')).toBeNull();
    expect(computeDelta(5, 0, 'percent')).toBeNull();
  });
});

describe('meanOf', () => {
  it('ignores nulls rather than counting them as zero', () => {
    expect(meanOf([90, null, 80])).toBe(85);
    expect(meanOf([null, null])).toBeNull();
  });
});

describe('getPageNumbers', () => {
  it('lists all pages when few', () => {
    expect(getPageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });
  it('elides long ranges around the current page', () => {
    expect(getPageNumbers(10, 51)).toEqual([1, 2, 3, '...', 9, 10, 11, '...', 51]);
  });
});
