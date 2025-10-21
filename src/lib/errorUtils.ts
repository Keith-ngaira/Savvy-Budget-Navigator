export function formatError(err: unknown): string {
  try {
    if (!err) return "Unknown error";

    if (err instanceof Error) {
      return err.message;
    }

    if (typeof err === "string") {
      return err;
    }

    if (typeof err === "object") {
      const errObj = err as any;

      // Handle Supabase errors with message property
      if (errObj.message && typeof errObj.message === "string") {
        return errObj.message;
      }

      // Handle Supabase errors with details
      if (errObj.details && typeof errObj.details === "string") {
        return errObj.details;
      }

      // Handle Supabase errors with hint
      if (errObj.hint && typeof errObj.hint === "string") {
        return errObj.hint;
      }

      // Handle Supabase errors with code
      if (errObj.code && typeof errObj.code === "string") {
        return `Error (${errObj.code})`;
      }

      // Try to get any string property that looks like an error message
      for (const key of Object.keys(errObj)) {
        if (typeof errObj[key] === "string" && errObj[key].length > 0) {
          return errObj[key];
        }
      }

      // Last resort: try JSON.stringify but catch if it fails
      try {
        const stringified = JSON.stringify(errObj);
        // Only return if it's not just "{}" or "[object Object]"
        if (stringified && stringified !== "{}" && stringified !== "[object Object]") {
          return stringified;
        }
      } catch (e) {
        // JSON.stringify failed, continue to fallback
      }
    }

    return "An unexpected error occurred";
  } catch (e) {
    return "Unable to process error";
  }
}
