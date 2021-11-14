export type Metadata = Record<string, any>;

export interface Entry {
  key: string;
  value: string;
  metadata?: Metadata;
  base64?: boolean;
  expiration?: number;
  expiration_ttl?: number;
}

export interface Data {
  value: string | null;
  metadata: Metadata | null;
}

export type Query<Payload = any> = (namespace: string, path: string, options?: Record<string, any>) => Promise<Payload | null>;

export interface Config {
  binding: string;
  source: string;
  output?: Record<string, PluginConfig>;
  site?: SiteConfig;
  plugins?: Array<PluginConfig>
}

export interface SiteConfig {
  basename?: string;
}

export interface PluginConfig {
  source: string;
  options?: Record<string, any>;
}

export type SetupBuildFunction = (options?: Record<string, any>) => Build;

export type MaybePromise<T> = T | Promise<T>;

export interface Build {
  transform?: (entry: Entry) => MaybePromise<Entry | Entry[]>;
  index?: (entries: Entry[]) => MaybePromise<Entry[]>;
}

export interface Handler<Payload = any> {
  (namespace: string, path: string, options: Record<string, any>): Promise<Payload | null>;
}

export interface HandlerFactory<Payload = any> {
  (kvNamespace: KVNamespace): Handler<Payload>;
}

export interface QueryEnhancer<Payload = any> {
  namespace: string;
  handlerFactory: HandlerFactory<Payload>;
}

export type SetupQueryFunction<Payload = any> = (options?: Record<string, any>) => HandlerFactory<Payload>;
