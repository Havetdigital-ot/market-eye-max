import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// Reserved subdomains that should NOT be treated as a generated-store slug.
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "preview",
  "staging",
  "id-preview",
  "project--816b14c5-85ed-4a82-b9f1-1846addd464c",
  "project--816b14c5-85ed-4a82-b9f1-1846addd464c-dev",
]);

// Apex hosts that should keep serving the main app, not be treated as a store.
const APEX_HOSTS = new Set([
  "market-eye.otmane.net",
  "market-eye-max.lovable.app",
  "localhost",
]);

/**
 * If the host is `<slug>.market-eye.otmane.net`, rewrite the request URL to
 * `/s/<slug>` (preserving subpath, search, headers, method, body) so the
 * existing TanStack route renders the storefront.
 */
function rewriteStoreSubdomain(request: Request): Request {
  try {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (APEX_HOSTS.has(host)) return request;
    // Already rewritten / direct hit
    if (url.pathname.startsWith("/s/")) return request;

    // Match *.market-eye.otmane.net
    const match = host.match(/^([a-z0-9-]+)\.market-eye\.otmane\.net$/);
    if (!match) return request;
    const slug = match[1];
    if (RESERVED_SUBDOMAINS.has(slug)) return request;

    const newPath = `/s/${slug}${url.pathname === "/" ? "" : url.pathname}`;
    const newUrl = new URL(newPath + url.search, url.origin);
    return new Request(newUrl.toString(), request);
  } catch {
    return request;
  }
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const rewritten = rewriteStoreSubdomain(request);
      const handler = await getServerEntry();
      const response = await handler.fetch(rewritten, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
