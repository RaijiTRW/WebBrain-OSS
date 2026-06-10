export class ApiHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    if (isSupabaseNetworkError(error.message)) {
      return supabaseNetworkErrorMessage;
    }

    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    if (isSupabaseNetworkError(error)) {
      return supabaseNetworkErrorMessage;
    }

    return error;
  }

  if (error && typeof error === "object") {
    const value = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    if (typeof value.message === "string" && value.message.trim()) {
      if (isSupabaseNetworkError(value.message)) {
        return supabaseNetworkErrorMessage;
      }

      return value.message;
    }

    if (typeof value.details === "string" && value.details.trim()) {
      return value.details;
    }

    if (typeof value.hint === "string" && value.hint.trim()) {
      return value.hint;
    }

    if (typeof value.code === "string" && value.code.trim()) {
      return value.code;
    }
  }

  return "Не удалось выполнить запрос";
}

export function getApiErrorStatus(error: unknown, fallback = 500) {
  if (error instanceof ApiHttpError) return error.status;

  const message = getApiErrorMessage(error);

  if (/client id is required|требуется вход|сессия истекла/i.test(message)) return 401;
  if (/сессия не совпадает|доступ запрещен/i.test(message)) return 403;

  return fallback;
}

const supabaseNetworkErrorMessage =
  "Не удалось подключиться к Supabase. Проверьте интернет, VPN и переменные SUPABASE_URL/SUPABASE_SECRET_KEY, затем повторите действие.";

function isSupabaseNetworkError(message: string) {
  return /fetch failed|network socket|tls connection|econnreset|etimedout/i.test(message);
}
