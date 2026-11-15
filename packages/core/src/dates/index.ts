import { KdtError } from '../errors.js';
import { assertNumeralSystem, convertDigits, type NumeralSystem } from '../numbers/digits.js';

/**
 * Sorani names of the Gregorian months, as used in the Kurdistan Region of Iraq (Syriac-origin
 * names shared with Iraqi Arabic), January first. The long u is spelled `وو` throughout. CLDR
 * spells December `کانونی یەکەم`, which is inconsistent with its own January spelling.
 *
 * These are Gregorian months. They are not the Kurdish solar months (خاکەلێوە, گوڵان, …), which
 * belong to a different calendar. KDT never converts between calendars.
 */
export const SORANI_MONTHS: readonly string[] = Object.freeze([
  'کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
  'تەمووز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم',
]);

/** Sorani weekday names, Sunday first (index matches `Date#getDay()`). */
export const SORANI_WEEKDAYS: readonly string[] = Object.freeze([
  'یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە',
]);

/** Day periods: short forms follow CLDR `ckb`. */
export const SORANI_DAY_PERIODS = Object.freeze({
  am: 'ب.ن',
  pm: 'د.ن',
  amLong: 'بەر لە نیوەڕۆ',
  pmLong: 'دوای نیوەڕۆ',
});

/** Calendar systems. Only `'gregorian'` is supported in this version. */
export type CalendarSystem = 'gregorian';

/** Calendar date and time fields of a moment in a specific time zone. */
export interface DateParts {
  readonly year: number;
  /** 1–12 */
  readonly month: number;
  readonly day: number;
  /** 0 = Sunday … 6 = Saturday */
  readonly weekday: number;
  /** 0–23 */
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

/** Options shared by the date functions. */
export interface DateOptions {
  /**
   * IANA time zone, e.g. `'Asia/Baghdad'` (the Kurdistan Region of Iraq) or `'UTC'`. [the runtime's
   * time zone]. Setting it explicitly is strongly recommended on servers.
   */
  readonly timeZone?: string;
  /** Only `'gregorian'` is accepted. Anything else throws `UNSUPPORTED_CALENDAR`. ['gregorian'] */
  readonly calendar?: CalendarSystem;
  /** Digits to use. ['arab'] */
  readonly numerals?: NumeralSystem;
}

/** Predefined date patterns. */
export type DateStyle = 'full' | 'long' | 'medium' | 'short';

/** Options for {@link formatDate}. */
export interface FormatDateOptions extends DateOptions {
  /** Either a style name or a custom pattern (see {@link formatDate}). ['long'] */
  readonly format?: DateStyle | (string & {});
}

/** Options for {@link formatTime}. */
export interface FormatTimeOptions extends DateOptions {
  /** Use a 12-hour clock with ب.ن / د.ن. [false] */
  readonly hour12?: boolean;
  /** Include seconds. [false] */
  readonly seconds?: boolean;
}

/**
 * Patterns behind each style. The `ی` suffix is the Sorani ezafe: `٢١ی ئازاری ٢٠٢٦` means
 * "the 21st of March 2026".
 */
export const DATE_STYLES: Readonly<Record<DateStyle, string>> = Object.freeze({
  full: "EEEE، d'ی' MMMM'ی' yyyy",
  long: "d'ی' MMMM'ی' yyyy",
  medium: 'd MMMM yyyy',
  short: 'dd/MM/yyyy',
});

function toDate(input: Date | number | string): Date {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new KdtError('INVALID_DATE', `Invalid date: ${String(input)}`);
  }
  return d;
}

function checkCalendar(calendar: unknown): void {
  if (calendar !== undefined && calendar !== 'gregorian') {
    throw new KdtError(
      'UNSUPPORTED_CALENDAR',
      `Calendar "${String(calendar)}" is not supported. KDT formats Gregorian dates only and never converts between calendars.`,
    );
  }
}

const WEEKDAY_INDEX: Readonly<Record<string, number>> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const PARTS_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/**
 * Returns the Gregorian date and time fields of `date` in `timeZone`. This lets you build your own
 * formats without depending on the runtime's Kurdish locale data.
 */
export function getDateParts(date: Date | number | string, options: Pick<DateOptions, 'timeZone' | 'calendar'> = {}): DateParts {
  checkCalendar(options.calendar);
  const d = toDate(date);
  const key = options.timeZone ?? '';
  let fmt = PARTS_FORMATTERS.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat('en-US', {
        calendar: 'gregory',
        numberingSystem: 'latn',
        hourCycle: 'h23',
        year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        era: 'short',
        ...(options.timeZone !== undefined ? { timeZone: options.timeZone } : {}),
      });
    } catch (error) {
      throw new KdtError('INVALID_OPTION', `Invalid timeZone: ${String(options.timeZone)}`);
    }
    PARTS_FORMATTERS.set(key, fmt);
  }
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) map[part.type] = part.value;
  let year = Number(map.year);
  if (map.era === 'BC') year = 1 - year; // astronomical year numbering
  return {
    year,
    month: Number(map.month),
    day: Number(map.day),
    weekday: WEEKDAY_INDEX[map.weekday ?? ''] ?? d.getDay(),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

const TOKEN_RE = /'([^']*)'|yyyy|yy|MMMM|MM|M|dd|d|EEEE|HH|H|hh|h|mm|m|ss|s|aaaa|a/g;

function pad(n: number, width = 2): string {
  const s = String(Math.abs(n)).padStart(width, '0');
  return n < 0 ? '-' + s : s;
}

function renderPattern(pattern: string, p: DateParts): string {
  return pattern.replace(TOKEN_RE, (token, literal: string | undefined) => {
    if (literal !== undefined) return literal === '' ? "'" : literal;
    const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
    switch (token) {
      case 'yyyy': return pad(p.year, 4);
      case 'yy': return pad(((p.year % 100) + 100) % 100);
      case 'MMMM': return SORANI_MONTHS[p.month - 1]!;
      case 'MM': return pad(p.month);
      case 'M': return String(p.month);
      case 'dd': return pad(p.day);
      case 'd': return String(p.day);
      case 'EEEE': return SORANI_WEEKDAYS[p.weekday]!;
      case 'HH': return pad(p.hour);
      case 'H': return String(p.hour);
      case 'hh': return pad(h12);
      case 'h': return String(h12);
      case 'mm': return pad(p.minute);
      case 'm': return String(p.minute);
      case 'ss': return pad(p.second);
      case 's': return String(p.second);
      case 'aaaa': return p.hour < 12 ? SORANI_DAY_PERIODS.amLong : SORANI_DAY_PERIODS.pmLong;
      case 'a': return p.hour < 12 ? SORANI_DAY_PERIODS.am : SORANI_DAY_PERIODS.pm;
      default: return token;
    }
  });
}

/**
 * Formats a Gregorian date in Sorani.
 *
 * Styles (shown for 21 March 2026):
 * - `full`   → `شەممە، ٢١ی ئازاری ٢٠٢٦`
 * - `long`   → `٢١ی ئازاری ٢٠٢٦` (default)
 * - `medium` → `٢١ ئازار ٢٠٢٦`
 * - `short`  → `٢١/٠٣/٢٠٢٦`
 *
 * Custom pattern tokens: `yyyy yy MMMM MM M dd d EEEE HH H hh h mm m ss s a aaaa`. Put literal text
 * in single quotes (`'ی'`); write `''` for a single quote. Any other character is copied as is.
 *
 * @example
 * formatDate(new Date('2026-03-21T09:05:00Z'), { timeZone: 'Asia/Baghdad', format: 'full' });
 * // 'شەممە، ٢١ی ئازاری ٢٠٢٦'
 */
export function formatDate(date: Date | number | string, options: FormatDateOptions = {}): string {
  const numerals = options.numerals ?? 'arab';
  assertNumeralSystem(numerals);
  const format = options.format ?? 'long';
  const pattern = Object.prototype.hasOwnProperty.call(DATE_STYLES, format)
    ? DATE_STYLES[format as DateStyle]
    : format;
  if (typeof pattern !== 'string' || pattern === '') {
    throw new KdtError('INVALID_PATTERN', 'Date format must be a style name or a non-empty pattern');
  }
  if ((pattern.match(/'/g) ?? []).length % 2 !== 0) {
    throw new KdtError('INVALID_PATTERN', `Unbalanced quote in pattern: ${pattern}`);
  }
  const parts = getDateParts(date, options);
  return convertDigits(renderPattern(pattern, parts), numerals);
}

/**
 * Formats a time of day in Sorani.
 *
 * @example
 * formatTime(new Date('2026-03-21T09:05:00Z'), { timeZone: 'UTC' });                 // '٠٩:٠٥'
 * formatTime(new Date('2026-03-21T15:05:00Z'), { timeZone: 'UTC', hour12: true });   // '٣:٠٥ د.ن'
 */
export function formatTime(date: Date | number | string, options: FormatTimeOptions = {}): string {
  const base = options.hour12 ? 'h:mm' : 'HH:mm';
  const pattern = (options.seconds ? base + ':ss' : base) + (options.hour12 ? ' a' : '');
  const { hour12: _h, seconds: _s, ...rest } = options;
  return formatDate(date, { ...rest, format: pattern });
}
