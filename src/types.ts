export type Metadata = {
  [key: string]: any | undefined;
}

export interface Entry {
  key: string;
  value: string;
  metadata?: Metadata;
}

export interface Reference {
  slug: string;
  metadata: Metadata | null;
}

export interface Data {
  content: string | null;
  metadata: Metadata | null;
}

export interface Query {
  listReferences(prefix: string, includeSubfolders?: boolean): Promise<Reference[] | null>;
  getData(slug: string): Promise<Data | null>;
}

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
