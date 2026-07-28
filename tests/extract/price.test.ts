import { describe, expect, it } from 'vitest';
import { detectCurrency, formatPrice, parseAmount, parsePrice, priceFromParts } from '@/src/extract/price';

describe('parseAmount', () => {
  it('parses dot-decimal with comma grouping', () => {
    expect(parseAmount('1,299.00')).toBe(1299);
    expect(parseAmount('1,234,567.89')).toBe(1234567.89);
  });

  it('parses comma-decimal with dot grouping', () => {
    expect(parseAmount('1.299,00')).toBe(1299);
    expect(parseAmount('1.234.567,89')).toBe(1234567.89);
  });

  it('parses space-grouped amounts', () => {
    expect(parseAmount('1 299,00')).toBe(1299);
    expect(parseAmount('12 990')).toBe(12990);
  });

  it('handles non-breaking and narrow spaces used as separators', () => {
    expect(parseAmount('1 299,00')).toBe(1299);
    expect(parseAmount('1 299')).toBe(1299);
  });

  it('treats a lone separator with two trailing digits as a decimal point', () => {
    expect(parseAmount('45,99')).toBe(45.99);
    expect(parseAmount('45.99')).toBe(45.99);
  });

  it('treats a lone separator with three trailing digits as grouping', () => {
    // Retail prices are not quoted to three decimal places.
    expect(parseAmount('1,299')).toBe(1299);
    expect(parseAmount('1.299')).toBe(1299);
  });

  it('takes the first value from a range', () => {
    expect(parseAmount('1 200 – 1 500')).toBe(1200);
  });

  it('ignores surrounding words and trailing punctuation', () => {
    expect(parseAmount('od 1 299 Kč')).toBe(1299);
    expect(parseAmount('1.299,-')).toBe(1299);
  });

  it('handles the bare Czech "999,-" form', () => {
    expect(parseAmount('999,-')).toBe(999);
    expect(parseAmount('12 990,-')).toBe(12990);
  });

  it('returns undefined when there is no number', () => {
    expect(parseAmount('Sold out')).toBeUndefined();
    expect(parseAmount('')).toBeUndefined();
  });
});

describe('detectCurrency', () => {
  it('recognises symbols and codes', () => {
    expect(detectCurrency('1 299 Kč', 'USD')).toBe('CZK');
    expect(detectCurrency('$19.99', 'CZK')).toBe('USD');
    expect(detectCurrency('19,99 €', 'CZK')).toBe('EUR');
    expect(detectCurrency('£19.99', 'CZK')).toBe('GBP');
    expect(detectCurrency('129 zł', 'CZK')).toBe('PLN');
  });

  it('falls back when nothing identifies the currency', () => {
    expect(detectCurrency('1299', 'CZK')).toBe('CZK');
  });
});

describe('parsePrice', () => {
  it('keeps the original string for auditing', () => {
    expect(parsePrice('1 299,00 Kč', 'CZK')).toEqual({
      amount: 1299,
      currency: 'CZK',
      raw: '1 299,00 Kč',
    });
  });

  it('returns undefined for unparseable input', () => {
    expect(parsePrice('Currently unavailable', 'CZK')).toBeUndefined();
    expect(parsePrice(undefined, 'CZK')).toBeUndefined();
  });
});

describe('priceFromParts', () => {
  it('trusts a valid ISO currency code over symbol sniffing', () => {
    expect(priceFromParts('1299.00', 'czk', 'USD')).toEqual({
      amount: 1299,
      currency: 'CZK',
      raw: '1299.00 czk',
    });
  });

  it('accepts numeric amounts from structured data', () => {
    expect(priceFromParts(45.5, 'EUR', 'CZK')?.amount).toBe(45.5);
  });

  it('rejects empty or non-numeric amounts', () => {
    expect(priceFromParts('', 'EUR', 'CZK')).toBeUndefined();
    expect(priceFromParts(undefined, 'EUR', 'CZK')).toBeUndefined();
    expect(priceFromParts('n/a', 'EUR', 'CZK')).toBeUndefined();
  });
});

describe('formatPrice', () => {
  it('formats known currencies without throwing', () => {
    expect(formatPrice({ amount: 1299, currency: 'CZK', raw: '' })).toContain('1');
  });

  it('degrades gracefully for an invalid currency code', () => {
    expect(formatPrice({ amount: 10, currency: 'NOTACODE', raw: '' })).toBe('10 NOTACODE');
  });

  it('returns an empty string when there is no price', () => {
    expect(formatPrice(undefined)).toBe('');
  });
});
