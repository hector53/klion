import type { Client } from "@/types";

const DEFAULT_CURRENCY = "USD";

export function getClientLogoUrl(client?: Client | null): string | undefined {
  const logoUrl = client?.metadata?.logoUrl;
  return typeof logoUrl === "string" && logoUrl.trim().length > 0
    ? logoUrl.trim()
    : undefined;
}

export function getClientHourlyRate(client?: Client | null): number | undefined {
  const rawRate = client?.metadata?.hourlyRate;

  if (typeof rawRate === "number" && Number.isFinite(rawRate) && rawRate >= 0) {
    return rawRate;
  }

  if (typeof rawRate === "string") {
    const parsed = Number(rawRate);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return undefined;
}

export function getClientCurrency(client?: Client | null): string {
  const rawCurrency = client?.metadata?.currency;
  return typeof rawCurrency === "string" && rawCurrency.trim().length === 3
    ? rawCurrency.trim().toUpperCase()
    : DEFAULT_CURRENCY;
}

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
