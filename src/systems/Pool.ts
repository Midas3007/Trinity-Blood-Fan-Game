/**
 * Fixed-size object pool. Objects are created up front by `create` and reused;
 * nothing is allocated during play. Pure (no Phaser), so it is unit tested.
 */
export class Pool<T> {
  private readonly free: T[] = [];
  private readonly used = new Set<T>();

  constructor(size: number, create: (index: number) => T) {
    for (let i = 0; i < size; i++) this.free.push(create(i));
  }

  /** Takes a free object, or null when the pool is exhausted. */
  acquire(): T | null {
    const item = this.free.pop();
    if (item === undefined) return null;
    this.used.add(item);
    return item;
  }

  release(item: T): void {
    if (!this.used.delete(item)) return; // ignore double release
    this.free.push(item);
  }

  get inUse(): number {
    return this.used.size;
  }

  get available(): number {
    return this.free.length;
  }

  /** Objects currently in use (snapshot). */
  active(): T[] {
    return [...this.used];
  }
}
