export const formatAgentErrorMessage = (rawError: unknown): string => {
  const errStr =
    rawError instanceof Error ? rawError.message : String(rawError);

  // 1. Account restriction / quota / 403 Forbidden
  if (
    errStr.includes("11140") ||
    errStr.includes("restricted") ||
    errStr.includes("unusual activity") ||
    errStr.includes("account has been restricted")
  ) {
    return "The upstream AI provider account is temporarily restricted due to policy or activity limits. Please try again later or switch models in the dashboard.";
  }

  // 2. Authentication failure / 401 Unauthorized
  if (
    errStr.includes("401") ||
    errStr.includes("Incorrect API key") ||
    errStr.includes("unauthorized") ||
    errStr.includes("invalid_api_key")
  ) {
    return "AI authentication failed. Please verify the API key and Base URL in the control dashboard.";
  }

  // 3. Rate limit / 429 Too Many Requests
  if (
    errStr.includes("429") ||
    errStr.includes("rate_limit") ||
    errStr.includes("quota exceeded")
  ) {
    return "The AI model is currently experiencing high demand or rate limits. Please wait a moment before trying again.";
  }

  // 4. Invalid JSON / Stream parsing error
  if (
    errStr.includes("Invalid JSON") ||
    errStr.includes("JSON Parse error") ||
    errStr.includes("SyntaxError")
  ) {
    return "Received an unexpected response stream from the model endpoint. Please retry or adjust stream settings.";
  }

  // 5. Connection refused / timeout
  if (
    errStr.includes("ECONNREFUSED") ||
    errStr.includes("ETIMEDOUT") ||
    errStr.includes("fetch failed")
  ) {
    return "Cannot reach the configured AI endpoint. Please verify that the provider or local model service is online.";
  }

  // 6. Generic friendly fallback - never leak raw stack traces or internal JSON to chat
  return "Unable to process your request due to an upstream model error. Please check the dashboard logs for details.";
};
