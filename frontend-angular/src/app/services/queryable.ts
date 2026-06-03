export class Queryable<T> {
  constructor(private items: T[]) {}

  where(pred: (x: T) => boolean): Queryable<T> {
    return new Queryable(this.items.filter(pred));
  }

  select<R>(fn: (x: T) => R): Queryable<R> {
    return new Queryable(this.items.map(fn));
  }

  orderBy(fn: (x: T) => string | number): Queryable<T> {
    const copy = [...this.items];
    copy.sort((a, b) => {
      const va = fn(a), vb = fn(b);
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
    return new Queryable(copy);
  }

  orderByDesc(fn: (x: T) => string | number): Queryable<T> {
    return this.orderBy(fn).reverse();
  }

  private reverse(): Queryable<T> {
    return new Queryable([...this.items].reverse());
  }

  groupBy<K extends string | number>(fn: (x: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const x of this.items) {
      const key = fn(x);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(x);
    }
    return map;
  }

  distinct(fn?: (x: T) => string | number): Queryable<T> {
    if (!fn) return new Queryable([...new Set(this.items)]);
    const seen = new Set<string | number>();
    return new Queryable(this.items.filter(x => {
      const k = fn(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }));
  }

  skip(n: number): Queryable<T> {
    return new Queryable(this.items.slice(n));
  }

  take(n: number): Queryable<T> {
    return new Queryable(this.items.slice(0, n));
  }

  any(pred?: (x: T) => boolean): boolean {
    return pred ? this.items.some(pred) : this.items.length > 0;
  }

  all(pred: (x: T) => boolean): boolean {
    return this.items.every(pred);
  }

  first(pred?: (x: T) => boolean): T | undefined {
    return pred ? this.items.find(pred) : this.items[0];
  }

  count(): number { return this.items.length; }
  toArray(): T[] { return [...this.items]; }
}

export function query<T>(items: T[]): Queryable<T> {
  return new Queryable(items);
}
