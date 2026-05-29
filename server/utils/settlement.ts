const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getSettlementAt(completedAt: Date) {
  const wib = new Date(completedAt.getTime() + WIB_OFFSET_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + 1, 5, 0, 0, 0));
}

/**
 * Start of the current WIB day (00:00 WIB), returned as a UTC Date.
 * Use for "today"/period boundaries so cutoffs match the WIB calendar
 * regardless of the server's local timezone.
 */
export function wibStartOfToday(now = new Date()) {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 0, 0, 0, 0) - WIB_OFFSET_MS);
}

/** Start of the current WIB month (1st 00:00 WIB), returned as a UTC Date. */
export function wibStartOfMonth(now = new Date()) {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1, 0, 0, 0, 0) - WIB_OFFSET_MS);
}

/** N days before the start of the current WIB day, returned as a UTC Date. */
export function wibStartDaysAgo(days: number, now = new Date()) {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - days, 0, 0, 0, 0) - WIB_OFFSET_MS);
}

export function formatSettlementDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
