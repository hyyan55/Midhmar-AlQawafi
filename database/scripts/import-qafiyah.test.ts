import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hasArabicLetters,
  normalizeArabicText,
  readNdjsonBatches,
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


describe('NDJSON batch reader', () => {
  it('streams records in bounded batches and preserves the final partial batch', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'qafiyah-ndjson-'));
    const filePath = join(directory, 'sample.ndjson');
    writeFileSync(filePath, '{"id":1}\n\n{"id":2}\n{"id":3}\n{"id":4}\n{"id":5}\n', 'utf8');

    try {
      const batches: Array<Array<{ id: number }>> = [];
      for await (const batch of readNdjsonBatches<{ id: number }>(filePath, 2)) {
        batches.push(batch);
      }
      expect(batches).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }, { id: 4 }], [{ id: 5 }]]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects a non-positive batch size', async () => {
    const batches = readNdjsonBatches('unused.ndjson', 0);
    await expect(batches.next()).rejects.toThrow('batchSize must be a positive integer');
  });
});
