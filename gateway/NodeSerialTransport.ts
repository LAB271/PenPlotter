import { SerialPort } from 'serialport';
import type { Transport } from '../src/transport/Transport';

/**
 * Node serial transport for the gateway daemon. Implements the same Transport
 * seam as the browser's WebSerialTransport, so the unchanged GrblController runs
 * under Node. The daemon opens this exactly once and keeps it open — the whole
 * point of the gateway (the CH340 macOS driver wedges on repeated reopen).
 */
export class NodeSerialTransport implements Transport {
  private port: SerialPort | null = null;
  private dataListeners = new Set<(d: Uint8Array) => void>();
  private closeListeners = new Set<() => void>();

  constructor(private opts: { path?: string; baudRate?: number; match?: RegExp } = {}) {}

  /** Resolve the device path: explicit, else first port matching the pattern. */
  private async resolvePath(): Promise<string> {
    if (this.opts.path) return this.opts.path;
    const match = this.opts.match ?? /usbserial|wchusbserial|usbmodem|ch340|ttyusb|ttyacm/i;
    const ports = await SerialPort.list();
    const hit = ports.find((p) => match.test(p.path) || match.test(p.manufacturer ?? ''));
    if (!hit)
      throw new Error('No matching serial device found (is the plotter powered/connected?).');
    return hit.path;
  }

  async open(): Promise<void> {
    const path = await this.resolvePath();
    const baudRate = this.opts.baudRate ?? 115200;
    await new Promise<void>((resolve, reject) => {
      const port = new SerialPort({ path, baudRate, autoOpen: false });
      port.open((err) => {
        if (err) {
          reject(new Error(`Failed to open ${path}: ${err.message}`));
          return;
        }
        this.port = port;
        port.on('data', (buf: Buffer) => {
          const bytes = new Uint8Array(buf);
          for (const l of this.dataListeners) {
            try {
              l(bytes);
            } catch (e) {
              console.log('[node-serial] data listener threw:', String((e as Error)?.message ?? e));
            }
          }
        });
        port.on('close', () => {
          this.port = null;
          for (const l of this.closeListeners) l();
        });
        port.on('error', (e) => {
          console.log('[node-serial] port error:', String(e?.message ?? e));
        });
        resolve();
      });
    });
  }

  async write(data: Uint8Array): Promise<void> {
    const port = this.port;
    if (!port) throw new Error('Port is not open.');
    await new Promise<void>((resolve, reject) => {
      port.write(Buffer.from(data), (err) => (err ? reject(err) : resolve()));
    });
  }

  async close(): Promise<void> {
    const port = this.port;
    this.port = null;
    if (!port || !port.isOpen) return;
    await new Promise<void>((resolve) => port.close(() => resolve()));
  }

  onData(listener: (data: Uint8Array) => void): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }
}
