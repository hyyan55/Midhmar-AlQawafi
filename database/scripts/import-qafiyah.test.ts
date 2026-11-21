import { describe, expect, it } from 'vitest';
import {
  hasArabicLetters,
  normalizeArabicText,
  splitQafiyahPoemVerses,
} from './import-qafiyah.ts';

describe('Qafiyah text normalization', () => {
  it('removes diacritics and normalizes common Arabic letter variants', () => {
    expect(normalizeArabicText('إِنَّ الفَتَى')).toBe('ان الفتي');
  });

  it('detects Arabic letters', () => {
    expect(hasArabicLetters('hello')).toBe(false);
    expect(hasArabicLetters('قصيدة')).toBe(true);
  });
});

describe('Qafiyah verse parsing', () => {
  it('pairs alternating hemistichs separated by asterisks', () => {
    expect(splitQafiyahPoemVerses('صدر البيت الأول*عجز البيت الأول*صدر البيت الثاني*عجز البيت الثاني')).toEqual([
      { sadr: 'صدر البيت الأول', ajuz: 'عجز البيت الأول' },
      { sadr: 'صدر البيت الثاني', ajuz: 'عجز البيت الثاني' },
    ]);
  });

  it('splits hemistichs separated by a tab', () => {
    expect(splitQafiyahPoemVerses('صدر البيت\tعجز البيت')).toEqual([
      { sadr: 'صدر البيت', ajuz: 'عجز البيت' },
    ]);
  });

  it('rejects incomplete or non-Arabic input', () => {
    expect(splitQafiyahPoemVerses('صدر البيت فقط')).toEqual([]);
    expect(splitQafiyahPoemVerses('hello*world')).toEqual([]);
  });
});
