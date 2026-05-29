import { PrismaClient } from "@prisma/client";

const POOL_PARAMS: Record<string, string> = {
  connection_limit: "10",
  pool_timeout: "20",
};

function buildDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    for (const [key, value] of Object.entries(POOL_PARAMS)) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    // Fallback for connection strings the URL parser can't handle: append
    // params using the correct separator without clobbering existing ones.
    const sep = raw.includes("?") ? "&" : "?";
    const extra = Object.entries(POOL_PARAMS)
      .filter(([key]) => !new RegExp(`[?&]${key}=`).test(raw))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    return extra ? `${raw}${sep}${extra}` : raw;
  }
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: buildDatabaseUrl(process.env.DATABASE_URL),
    },
  },
});
