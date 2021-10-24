export type Metadata = {
  [key: string]: any | undefined;
}

export interface Entry {
  key: string;
  value: string;
  metadata?: Metadata;
}

export interface Data {
  content: string | null;
  metadata: Metadata | null;
}

export interface DefaultClient {
  getData(slug: string): Promise<Data | null>;
}

export type Client<T extends DefaultClient = DefaultClient> = DefaultClient & T;

export interface Config {
  binding: string;
  source: string;
  plugins?: Array<PluginConfig>
}

export interface PluginConfig {
  source: string;
  options?: Record<string, any>;
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
