export function formatError(err: unknown): string {
  try {
    if (!err) return String(err);
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    // Try to pull common supabase error shape
    // Supabase errors often have message, status, details
    // @ts-ignore
    if (typeof err === "object") {
      // @ts-ignore
      if (err.message) return String(err.message);
      return JSON.stringify(err, Object.getOwnPropertyNames(err));
    }
    return String(err);
  } catch (e) {
    return String(err);
  }
}
