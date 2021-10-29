export type Metadata = Record<string, any>;

export interface Entry {
  key: string;
  value: string;
  metadata?: Metadata;
}

export interface Data {
  content: string | null;
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

export interface Build {
  namespace?: string;
  transform?: (entry: Entry) => Entry | Promise<Entry>;
  derive?: (entries: Entry[]) => Entry[] | Promise<Entry[]>;
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
