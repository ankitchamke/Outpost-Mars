/**
 * Minimal ambient type definitions for Node.js built-ins used by development scripts.
 * Eliminates external dependency on @types/node while maintaining strict type safety.
 */

declare module 'node:fs/promises' {
  export function writeFile(path: string, data: string, encoding?: string): Promise<void>;
  export function readFile(path: string, encoding: string): Promise<string>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function unlink(path: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  export function readdir(path: string): Promise<string[]>;
  export function stat(path: string): Promise<{ isDirectory(): boolean }>;
  export function copyFile(src: string, dest: string): Promise<void>;
  export function access(path: string): Promise<void>;
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string): string;
}

declare const process: {
  cwd(): string;
  argv: string[];
  exit(code?: number): never;
  platform?: string;
};

declare const Buffer: {
  byteLength(string: string): number;
};
