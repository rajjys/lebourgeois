export function formatMoney(amount: number | null, currency: string | null = 'USD'): string {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  }