// lib.dom.d.ts doesn't ship Background Sync types. Minimal augmentation,
// same pattern as next-auth.d.ts's module augmentation elsewhere in src/types.
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}
