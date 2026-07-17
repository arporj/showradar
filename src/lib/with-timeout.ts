// Server Actions dispatched from a startTransition can, in rare cases (e.g.
// a dropped connection), leave their promise never settling — no resolve,
// no reject — which would pin `isPending` (and any loading spinner tied to
// it) forever. Races the call against a timeout so the UI always recovers;
// the mutation itself either already landed server-side or will on retry,
// this only bounds how long the client waits to hear back.
export function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}
