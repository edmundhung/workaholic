export type Metadata = {
  title: string;
  description: string;
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
