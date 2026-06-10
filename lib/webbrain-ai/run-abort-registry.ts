/**
 * In-memory registry of AbortControllers for in-flight AI runs, keyed by chat id.
 *
 * Generation must NOT die with the HTTP connection: a page reload or network blip only
 * stops the SSE stream, while the run keeps working and persisting messages — the client
 * re-attaches by polling. The ONLY thing that aborts a run is the explicit Stop action,
 * which looks the controller up here. Stored on globalThis so dev hot-reload reuses the map.
 */
const registry: Map<string, AbortController> = ((
  globalThis as unknown as { __webbrainRunAborts?: Map<string, AbortController> }
).__webbrainRunAborts ??= new Map());

/** Create + register the controller for a new run; an older run in the chat is superseded. */
export function createRunAbortController(chatId: string): AbortController {
  const existing = registry.get(chatId);
  if (existing && !existing.signal.aborted) existing.abort();

  const controller = new AbortController();
  registry.set(chatId, controller);
  return controller;
}

/** Remove the controller after the run settles (only if it is still the registered one). */
export function releaseRunAbortController(chatId: string, controller: AbortController) {
  if (registry.get(chatId) === controller) registry.delete(chatId);
}

/** Explicit Stop: abort the chat's active run. Returns whether something was aborted. */
export function abortActiveRun(chatId: string): boolean {
  const controller = registry.get(chatId);
  if (!controller || controller.signal.aborted) return false;

  controller.abort();
  registry.delete(chatId);
  return true;
}
