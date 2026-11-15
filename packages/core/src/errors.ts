/** Stable error codes. Codes are part of the public API and only change in a major release. */
export type KdtErrorCode =
  | 'INVALID_NUMBER'
  | 'NUMBER_OUT_OF_RANGE'
  | 'PARSE_ERROR'
  | 'INVALID_DATE'
  | 'INVALID_PATTERN'
  | 'UNSUPPORTED_CALENDAR'
  | 'UNKNOWN_CURRENCY'
  | 'INVALID_OPTION'
  | 'MISSING_TRANSLATION';

/** Every error thrown by KDT is a `KdtError` with a machine-readable `code`. */
export class KdtError extends Error {
  readonly code: KdtErrorCode;

  constructor(code: KdtErrorCode, message: string) {
    super(message);
    this.name = 'KdtError';
    this.code = code;
  }
}
