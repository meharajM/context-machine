declare module 'proper-lockfile' {
  export interface LockOptions {
    retries?: number;
  }

  export type ReleaseFn = () => Promise<void>;

  const lockfile: {
    lock(file: string, options?: LockOptions): Promise<ReleaseFn>;
  };

  export default lockfile;
}
