const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function reportNotificationPath(id: number): string {
  return `/incidents?report=${id}`;
}

export function accountNotificationPath(id: string): string {
  return ACCOUNT_ID.test(id)
    ? `/superadmin?account=${encodeURIComponent(id)}`
    : "/superadmin";
}

export function safeNotificationReturnPath(value: unknown, role: string): string | null {
  if (typeof value !== "string") return null;
  const reportMatch = /^\/incidents\?report=([1-9]\d*)$/.exec(value);
  if (reportMatch && Number.isSafeInteger(Number(reportMatch[1]))) return value;
  const accountMatch = /^\/superadmin\?account=([^&]+)$/.exec(value);
  if (role === "superadmin" && accountMatch && ACCOUNT_ID.test(accountMatch[1])) {
    return value;
  }
  return null;
}
