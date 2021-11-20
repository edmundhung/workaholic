export type Metadata = Record<string, any>;

export interface Entry {
  key: string;
  value: string | ArrayBuffer;
  metadata?: Metadata;
  base64?: boolean;
  expiration?: number;
  expiration_ttl?: number;
}

export interface Data {
  value: string | null;
  metadata: Metadata | null;
}

export type Query<Payload = any> = (namespace: string, slug: string, options?: Record<string, any>) => Promise<Payload | null>;

export interface Options {
  binding: string;
  source: string;
  config: string;
  site?: SiteOptions;
}

export interface SiteOptions {
  basename?: string;
}

export type SetupBuildFunction = (options?: Record<string, any>) => Build;

export type MaybePromise<T> = T | Promise<T>;

export type Build = (entries: Entry[]) => MaybePromise<Record<string, Entry[]>>;

export interface QueryEnhancer<Payload = any> {
  (query: Query): Query<Payload>;
}

export type SetupQueryFunction<Payload = any> = (options?: Record<string, any>) => QueryEnhancer<Payload>;
