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

export interface Article {
  content: string | null;
  metadata: Metadata | null;
}

export interface Query {
  listReferences(prefix: string, includeSubfolders: boolean): Promise<Reference[] | null>;
  getArticle(slug: string): Promise<Article | null>;
}
