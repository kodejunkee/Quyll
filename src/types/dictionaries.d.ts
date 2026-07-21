declare module 'thesaurus' {
  export function find(word: string): string[];
  export function toJson(): Record<string, string[]>;
  const thesaurus: {
    find(word: string): string[];
    toJson(): Record<string, string[]>;
  };
  export default thesaurus;
}

declare module 'synonyms' {
  interface SynonymsResult {
    n?: string[];
    v?: string[];
    s?: string[];
    [key: string]: string[] | undefined;
  }
  function synonyms(word: string): SynonymsResult | undefined;
  export default synonyms;
}
