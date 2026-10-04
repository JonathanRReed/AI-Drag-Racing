## 2025-05-18 - API Key Exposure via Error Messages and Console Logs

**Vulnerability:** Upstream provider errors and unhandled request exceptions in completion streams and model listing endpoints could expose raw API keys or Authorization headers directly to clients and server logs.
**Learning:** Returning or logging raw `error.message` strings without sanitization when calling third-party LLM endpoints can leak API tokens included in error payloads or request parameters.
**Prevention:** Always filter error messages and exceptions through a credential redaction function (`redactCredentials`) before streaming them to clients, logging to `console.error`, or displaying UI alerts.
