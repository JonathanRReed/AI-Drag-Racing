## 2025-05-18 - Redact Sensitive Credentials in API Error Responses and Server Logs
**Vulnerability:** External provider API errors during model fetching or completion streams could leak raw API keys, AWS credentials, or Bearer tokens in server logs or client SSE error streams.
**Learning:** Catch blocks that log `error.message` or return raw exception messages directly to clients risk exposing sensitive header or parameter values if third-party LLM provider SDKs or HTTP clients echo back request headers on failure.
**Prevention:** Always pass error objects and raw messages through `redactCredentials(error, explicitKey)` before printing to `console.error` or streaming `type: 'error'` events back to clients.
