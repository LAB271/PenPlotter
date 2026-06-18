/**
 * Accumulates incoming bytes and emits complete, trimmed lines.
 * GRBL terminates responses with `\r\n` (or `\n`); status reports `<...>`
 * arrive as their own lines too.
 */
export class LineReader {
  private buffer = '';
  private decoder = new TextDecoder();

  constructor(private readonly onLine: (line: string) => void) {}

  push(bytes: Uint8Array): void {
    this.buffer += this.decoder.decode(bytes, { stream: true });
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).replace(/\r$/, '').trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (line.length) this.onLine(line);
    }
  }

  /** Drop any partial line so a new session starts clean. */
  reset(): void {
    this.buffer = '';
  }
}
