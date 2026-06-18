type Handler<T> = (payload: T) => void;

/** Minimal, framework-free typed event emitter (works in browser and Node). */
export class Emitter<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<Handler<unknown>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => {
      set!.delete(handler as Handler<unknown>);
    };
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (set) for (const h of set) (h as Handler<E[K]>)(payload);
  }
}
