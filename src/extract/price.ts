import type { Price } from '../domain/types';

/**
 * Price parsing.
 *
 * Shops write prices every way imaginable — "$1,299.00", "1 299,00 Kč", "1.299,- €",
 * "od 45,99". This module turns those into a number plus a currency, and always keeps
 * the original string so a bad parse stays visible and correctable rather than silently
 * becoming a wrong number.
 */

const CURRENCY_SYMBOLS: Array<[RegExp, string]> = [
  [/kč|czk/i, 'CZK'],
  [/€|eur\b/i, 'EUR'],
  [/£|gbp\b/i, 'GBP'],
  [/\$|usd\b/i, 'USD'],
  [/zł|pln\b/i, 'PLN'],
  [/\bft\b|huf\b/i, 'HUF'],
  [/¥|jpy\b|cny\b|rmb\b/i, 'JPY'],
  [/₽|rub\b/i, 'RUB'],
  [/₹|inr\b/i, 'INR'],
  [/chf\b/i, 'CHF'],
  [/sek\b/i, 'SEK'],
  [/nok\b/i, 'NOK'],
  [/dkk\b/i, 'DKK'],
  [/\bron\b/i, 'RON'],
  [/\bbgn\b|лв/i, 'BGN'],
];

export function detectCurrency(text: string, fallback: string): string {
  for (const [pattern, code] of CURRENCY_SYMBOLS) {
    if (pattern.test(text)) return code;
  }

  // A bare ISO-looking code we don't have a symbol rule for, e.g. "AUD 30".
  const isoMatch = /\b([A-Z]{3})\b/.exec(text);
  if (isoMatch?.[1]) return isoMatch[1];

  return fallback;
}

/**
 * Works out which separator is the decimal point, then returns a plain number.
 *
 * The awkward case is a single separator followed by three digits — "1,299" and
 * "1.299" are 1299 in most of the world but could in principle be 1.299. Three
 * trailing digits is treated as a thousands group, since sub-unit precision of
 * three decimals effectively never appears on a retail price tag.
 */
export function parseAmount(raw: string): number | undefined {
  // Keep only the first number-ish run: handles ranges ("1 200 – 1 500") and
  // strings like "od 1 299 Kč / ks" by taking the leading price.
  const match = /\d[\d\s.,  ']*/.exec(raw);
  if (!match) return undefined;

  // Normalise the various Unicode spaces used as thousands separators.
  let token = match[0].replace(/[\s  ']/g, '');
  token = token.replace(/[.,]+$/, ''); // trailing "1.299,-" style punctuation

  if (!token) return undefined;

  const lastDot = token.lastIndexOf('.');
  const lastComma = token.lastIndexOf(',');

  let decimalIndex = -1;

  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: whichever comes last is the decimal separator.
    decimalIndex = Math.max(lastDot, lastComma);
  } else if (lastDot >= 0 || lastComma >= 0) {
    const index = Math.max(lastDot, lastComma);
    const separator = token[index]!;
    const occurrences = token.split(separator).length - 1;
    const trailingDigits = token.length - index - 1;

    // Repeated separator is unambiguously grouping ("1.234.567").
    // One or two trailing digits is unambiguously a decimal ("45,99").
    if (occurrences === 1 && trailingDigits > 0 && trailingDigits <= 2) {
      decimalIndex = index;
    }
  }

  const integerPart =
    decimalIndex >= 0 ? token.slice(0, decimalIndex) : token;
  const fractionPart = decimalIndex >= 0 ? token.slice(decimalIndex + 1) : '';

  const digits = integerPart.replace(/[^\d]/g, '');
  if (!digits) return undefined;

  const value = Number(`${digits}${fractionPart ? `.${fractionPart}` : ''}`);
  return Number.isFinite(value) ? value : undefined;
}

/** Parses a price string found on a page. Returns undefined if there's no number in it. */
export function parsePrice(raw: string | undefined, fallbackCurrency: string): Price | undefined {
  if (!raw) return undefined;

  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;

  const amount = parseAmount(text);
  if (amount === undefined) return undefined;

  return { amount, currency: detectCurrency(text, fallbackCurrency), raw: text };
}

/**
 * Builds a price from structured data, where the amount and currency come as
 * separate fields and the amount is already machine-readable.
 */
export function priceFromParts(
  amount: string | number | undefined,
  currency: string | undefined,
  fallbackCurrency: string,
): Price | undefined {
  if (amount === undefined || amount === null || amount === '') return undefined;

  const raw = String(amount);
  const value = typeof amount === 'number' ? amount : parseAmount(raw);
  if (value === undefined || !Number.isFinite(value)) return undefined;

  const code = currency?.trim().toUpperCase();

  return {
    amount: value,
    currency: code && /^[A-Z]{3}$/.test(code) ? code : detectCurrency(raw, fallbackCurrency),
    raw: currency ? `${raw} ${currency}` : raw,
  };
}

const CURRENCY_LOCALES: Record<string, string> = {
  CZK: 'cs-CZ',
  EUR: 'de-DE',
  GBP: 'en-GB',
  USD: 'en-US',
  PLN: 'pl-PL',
  HUF: 'hu-HU',
};

/** Display helper. Falls back to a plain number if the currency code isn't valid. */
export function formatPrice(price: Price | undefined): string {
  if (!price) return '';

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[price.currency] ?? 'en-US', {
      style: 'currency',
      currency: price.currency,
      maximumFractionDigits: Number.isInteger(price.amount) ? 0 : 2,
    }).format(price.amount);
  } catch {
    return `${price.amount} ${price.currency}`;
  }
}
