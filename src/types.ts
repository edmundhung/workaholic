export type Metadata = {
  [key: string]: string | undefined;
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

export interface Options {
  binding: string;
  source: string;
  plugins?: Array<PluginOptions>
}

export interface PluginOptions {
  source: string;
  [param: string]: any;
}
