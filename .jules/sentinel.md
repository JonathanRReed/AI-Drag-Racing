## 2025-05-18 - Credential Redaction in API Error Logs and Streams
**Vulnerability:** Raw error messages from upstream AI providers or network requests could expose user API keys or Authorization headers in server logs or SSE stream error events.
**Learning:** Upstream API errors or fetch rejections can echo request headers or parameters. Relying on default `error.message` serializations risks credential leakage.
**Prevention:** Always pass error strings and explicit API keys through `redactCredentials()` in `utils/requestSecurity.ts` before logging or returning error events to clients.
