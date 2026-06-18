/**
 * Transport: the only seam between the GRBL engine and the physical link.
 *
 * The engine (src/grbl) depends solely on this interface — never on Web Serial,
 * the DOM, or React — so the same engine can later run under Node on a Raspberry
 * Pi behind a NodeSerialTransport with no changes (see design.md, task 3.6).
 */
export interface Transport {
  /** Open the connection (may prompt the user, e.g. the Web Serial chooser). */
  open(): Promise<void>;
  /**
   * Re-open an already-granted device without a user gesture (e.g. after a
   * replug). Returns false if no granted device is available. Optional.
   */
  reopen?(): Promise<boolean>;
  /** Close the connection and release the underlying resource. */
  close(): Promise<void>;
  /** Write raw bytes to the device. */
  write(data: Uint8Array): Promise<void>;
  /** Subscribe to incoming bytes. Returns an unsubscribe function. */
  onData(listener: (data: Uint8Array) => void): () => void;
  /** Subscribe to unexpected close/disconnect. Returns an unsubscribe function. */
  onClose(listener: () => void): () => void;
}
