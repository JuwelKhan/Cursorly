/**
 * Minimal event emitter. A handler returning `false` vetoes a cancelable event —
 * `emit()` then returns false.
 */
export class Emitter {
  #handlers = new Map();

  on(type, handler) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  once(type, handler) {
    const off = this.on(type, (detail) => {
      off();
      return handler(detail);
    });
    return off;
  }

  off(type, handler) {
    if (!handler) this.#handlers.delete(type);
    else this.#handlers.get(type)?.delete(handler);
  }

  emit(type, detail) {
    let allowed = true;
    for (const handler of [...(this.#handlers.get(type) || [])]) {
      if (handler(detail) === false) allowed = false;
    }
    return allowed;
  }
}
