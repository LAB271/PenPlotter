import type { Transport } from '../../transport/Transport';

/** In-memory transport for tests: records writes, lets tests feed incoming data. */
export class FakeTransport implements Transport {
  written: string[] = [];
  private dataListeners = new Set<(d: Uint8Array) => void>();
  private closeListeners = new Set<() => void>();
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();

  async open(): Promise<void> {}
  async close(): Promise<void> {}

  async write(data: Uint8Array): Promise<void> {
    this.written.push(this.decoder.decode(data));
  }

  onData(listener: (d: Uint8Array) => void): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  /** Simulate incoming bytes from GRBL. */
  feed(text: string): void {
    const bytes = this.encoder.encode(text);
    for (const l of this.dataListeners) l(bytes);
  }

  /** Count of line commands written (excludes single-byte real-time commands). */
  get lineWrites(): string[] {
    return this.written.filter((w) => w.endsWith('\n'));
  }
}

/** Flush pending microtasks (the controller serializes writes on a promise chain). */
export const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
