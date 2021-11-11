export type Metadata = Record<string, any>;

export interface Entry {
  key: string;
  value: string;
  metadata?: Metadata;
}

export interface Data {
  value: string | null;
  metadata: Metadata | null;
}

export type Query<Payload = any> = (namespace: string, path: string, options?: Record<string, any>) => Promise<Payload | null>;

export interface Config {
  binding: string;
  source: string;
  site?: SiteConfig;
  plugins?: Array<PluginConfig>
}

export interface SiteConfig {
  basename?: string;
}

export interface PluginConfig {
  source: string;
  buildOptions?: Record<string, any>;
  queryOptions?: Record<string, any>;
}

export interface Plugin {
  name?: string;
  setupBuild?: SetupBuildFunction;
}

export type SetupBuildFunction = (options?: Record<string, any>) => Build;

export type MaybePromise<T> = T | Promise<T>;

export interface Build {
  namespace?: string;
  transform?: (entry: Entry) => MaybePromise<Entry | Entry[]>;
  index?: (entries: Entry[]) => MaybePromise<Entry[]>;
}

export interface Handler<Payload = any> {
  (path: string, options: Record<string, any>): Promise<Payload | null>;
}

export interface HandlerFactory<Payload = any> {
  (kvNamespace: KVNamespace): Handler<Payload>;
}

export interface QueryEnhancer<Payload = any> {
  namespace: string;
  handlerFactory: HandlerFactory<Payload>;
}

export type SetupQueryFunction<Payload = any> = (options?: Record<string, any>) => QueryEnhancer<Payload>;
