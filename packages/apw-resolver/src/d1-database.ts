/** Structural D1 adapter contract; consumers need no ambient Worker types. */
export interface D1Database {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      run(): Promise<{ meta?: { changes?: number } }>;
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results?: T[] }>;
    };
    run(...params: unknown[]): Promise<{ meta?: { changes?: number } }>;
    get<T>(): T | undefined;
    all<T>(): { results?: T[] };
  };
  batch(statements: unknown[]): Promise<Array<{ meta?: { changes?: number } }>>;
  exec(sql: string): unknown;
}
