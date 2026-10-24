## 2026-10-23 - Redacting API Keys in Model Discovery and SSE Parser Error Logs
**Vulnerability:** Upstream API failures and stream JSON parse errors were logging raw exception objects to `console.error` or `console.warn`, which could leak user API keys or bearer tokens in client console logs.
**Learning:** External LLM error responses and stream chunks often echo authorization headers or request body credentials in error messages. Logging raw `Error` objects bypasses redaction unless passed through `redactCredentials`.
**Prevention:** Always sanitize exception messages and error objects via `redactCredentials(error, apiKey)` before logging in client-side or edge fetch routines.
