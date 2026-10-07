## 2025-05-18 - Credential Redaction in API Error Streams and Logs
**Vulnerability:** Upstream LLM provider error messages (e.g. 401/403 HTTP error bodies or fetch exceptions) can echo user API keys or Bearer headers back into edge server logs (`console.error`) or SSE client streams.
**Learning:** Returning unparsed or unhandled error messages directly from API handlers risks leaking raw user credentials when third-party provider responses contain requested keys or headers.
**Prevention:** Sanitize error strings using `redactCredentials` in `utils/requestSecurity.ts` before writing error events to SSE responses or console logs.
