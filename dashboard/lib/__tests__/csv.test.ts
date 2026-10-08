import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/lib/csv';

describe('csvCell', () => {
  it('passes plain values through', () => {
    expect(csvCell('INT-100001')).toBe('INT-100001');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes separators, quotes and newlines', () => {
    expect(csvCell('Smith, Jo')).toBe('"Smith, Jo"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '=HYPERLINK("http://x","y")'])(
    'neutralizes formula-like string %j',
    (v) => {
      const out = csvCell(v);
      expect(out.replace(/^"/, '').startsWith("'")).toBe(true);
    }
  );
});

describe('toCsv', () => {
  it('writes a header and CRLF-terminated rows', () => {
    const csv = toCsv([{ id: 'A', n: 1 }, { id: 'B,C', n: null }], [
      { key: 'id', header: 'ID' },
      { key: 'n', header: 'Count' },
    ]);
    expect(csv).toBe('ID,Count\r\nA,1\r\n"B,C",\r\n');
  });
});
