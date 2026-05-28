const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getSettlementAt(completedAt: Date) {
  const wib = new Date(completedAt.getTime() + WIB_OFFSET_MS);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + 1, 5, 0, 0, 0));
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
