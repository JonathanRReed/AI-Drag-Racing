import models from '../pages/api/models';
import bedrockModels from '../pages/api/bedrock-models';
import completions from '../pages/api/providers/[providerId]/completions';
import securityHeaders from '../lib/security-headers.json';

interface PagesEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// This is the complete application-owned request surface. The build verifies
// these same descriptors in the emitted worker, not an unrelated route list.
export const apiRoutes = [
  { path: '/api/models', matches: (path: string) => path === '/api/models', handler: models },
  { path: '/api/bedrock-models', matches: (path: string) => path === '/api/bedrock-models', handler: bedrockModels },
  // The former adapter used a case-insensitive dynamic route matcher, while
  // the existing handler performs its own case-sensitive provider extraction.
  { path: '/api/providers/[providerId]/completions', matches: (path: string) => /^\/api\/providers\/[^/]+\/completions$/i.test(path), handler: completions },
] as const;

function apiResponse(request: Request, response: Response): Response {
  const headers = new Headers(securityHeaders);
  response.headers.forEach((value, key) => headers.set(key, value));
  // Do not read, clone or buffer SSE bodies. Keep their original backpressure
  // and cancellation path; HEAD carries status/headers but never a response body.
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status, statusText: response.statusText, headers,
  });
}

export default {
  async fetch(request: Request, env: PagesEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    // Preserve Next's default 308 trailing-slash canonicalization, including
    // query parameters and HTTP method on the subsequent request.
    if (/^\/(?:[^/]+\/)+$/.test(url.pathname)) {
      const params = new URLSearchParams();
      for (const [key, value] of url.searchParams) {
        if (!params.has(key) || (value && !params.getAll(key).includes(value))) params.append(key, value);
      }
      const query = params.toString();
      return apiResponse(request, new Response(null, {
        status: 308, headers: { Location: url.pathname.slice(0, -1) + (query ? `?${query}` : '') },
      }));
    }
    const route = apiRoutes.find(route => route.matches(url.pathname));
    if (route) {
      // Pass the actual incoming Request, including its body, signal and cf.
      return apiResponse(request, await route.handler(request));
    }
    // Match the old adapter's unknown-route HTML 404, not the SPA index or a
    // prefix-matched API. /404 avoids Pages' .html canonicalization redirect.
    const notFound = await env.ASSETS.fetch(new Request(new URL(`/404${url.search}`, url), request));
    return apiResponse(request, new Response(notFound.body, { status: 404, headers: notFound.headers }));
  },
};
