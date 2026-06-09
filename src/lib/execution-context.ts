// Tracks the current Cloudflare Workers ExecutionContext per request so
// server functions can extend background work past the HTTP response via
// ctx.waitUntil(). Without this, work detached with setImmediate / unawaited
// promises is terminated when the response is returned.
import { AsyncLocalStorage } from "node:async_hooks";

type ExecutionCtx = { waitUntil?: (p: Promise<unknown>) => void };

const storage = new AsyncLocalStorage<ExecutionCtx | undefined>();

export function runWithExecutionCtx<T>(ctx: unknown, fn: () => T): T {
  return storage.run(ctx as ExecutionCtx | undefined, fn);
}

/**
 * Keep `promise` alive past the current HTTP response. On Cloudflare Workers
 * this calls ctx.waitUntil(); in environments without one (local dev) the
 * promise is simply not awaited and runs on the event loop.
 */
export function waitUntil(promise: Promise<unknown>): void {
  const ctx = storage.getStore();
  if (ctx && typeof ctx.waitUntil === "function") {
    try {
      ctx.waitUntil(promise);
      return;
    } catch {
      // fall through
    }
  }
  // Local/Node fallback — swallow rejections so they don't crash the process.
  promise.catch((e) => console.error("[waitUntil fallback]", e));
}
