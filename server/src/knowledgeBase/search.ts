import type { KnowledgeEntry } from "./entries.ts";
import { tokenize } from "./text.ts";

export interface SearchHit {
  entry: KnowledgeEntry;
  score: number;
}

export interface SearchResult {
  found: boolean;
  hits: SearchHit[];
  coverage: number;
  terms: string[];
}

export interface SearchOptions {
  limit?: number;
}

// BM25 (https://en.wikipedia.org/wiki/Okapi_BM25) with its usual parameters.
const K1 = 1.2;
const B = 0.75;
// Titles and keywords count more than the body text.
const TITLE_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;
export const MIN_COVERAGE = 0.5;
const RELATIVE_CUTOFF = 0.5;

interface IndexedEntry {
  entry: KnowledgeEntry;
  termFreq: Map<string, number>;
  length: number;
}

export class KnowledgeBase {
  readonly entries: readonly KnowledgeEntry[];
  private readonly index: IndexedEntry[];
  private readonly docFreq = new Map<string, number>();
  private readonly avgLength: number;

  constructor(entries: KnowledgeEntry[]) {
    const ids = new Set<string>();
    for (const e of entries) {
      if (ids.has(e.id)) {
        throw new Error(`Duplicate knowledge base entry "${e.id}"`);
      }
      ids.add(e.id);
    }

    this.entries = entries;

    this.index = entries.map((entry) => {
      const terms = [
        ...Array<string[]>(TITLE_WEIGHT).fill(tokenize(entry.title)).flat(),
        ...Array<string[]>(KEYWORD_WEIGHT)
          .fill(tokenize(entry.keywords.join(" ")))
          .flat(),
        ...tokenize(entry.content),
      ];

      const termFreq = new Map<string, number>();
      for (const t of terms) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
      for (const t of termFreq.keys()) {
        this.docFreq.set(t, (this.docFreq.get(t) ?? 0) + 1);
      }
      return { entry, termFreq, length: terms.length };
    });

    this.avgLength = this.index.reduce((sum, d) => sum + d.length, 0) /
      (this.index.length || 1);
  }

  get(id: string): KnowledgeEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  private idf(term: string): number {
    const n = this.docFreq.get(term) ?? 0;
    const total = this.index.length;
    return Math.log(1 + (total - n + 0.5) / (n + 0.5));
  }

  search(question: string, { limit = 3 }: SearchOptions = {}): SearchResult {
    const terms = [...new Set(tokenize(question))];

    const scored: SearchHit[] = this.index.map((doc) => {
      let score = 0;
      for (const t of terms) {
        const tf = doc.termFreq.get(t);
        if (!tf) continue;
        const norm = tf + K1 * (1 - B + (B * doc.length) / this.avgLength);
        score += this.idf(t) * ((tf * (K1 + 1)) / norm);
      }
      return { entry: doc.entry, score: Math.round(score * 100) / 100 };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    const best = top?.score ?? 0;

    const total = terms.reduce((sum, t) => sum + this.idf(t), 0);
    const termFreq = top
      ? this.index.find((d) => d.entry === top.entry)?.termFreq
      : undefined;
    const matched = terms.filter((t) => termFreq?.has(t)).reduce(
      (sum, t) => sum + this.idf(t),
      0,
    );
    const coverage = total ? Math.round((matched / total) * 100) / 100 : 0;

    if (best === 0 || coverage < MIN_COVERAGE) {
      return { found: false, hits: [], terms, coverage };
    }

    const cutoff = best * RELATIVE_CUTOFF;
    const hits = scored.filter((h) => h.score >= cutoff).slice(0, limit);
    return { found: true, hits, terms, coverage };
  }
}
