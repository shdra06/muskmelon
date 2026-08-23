import { OpenAI } from 'openai';
import { VectorStore } from '../vectorstore';
import { ChatMode, TemporalChunk } from '../types';

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && !process.env.OPENAI_API_KEY.includes('...')) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Time-aware retriever with OpenAI embedding and robust semantic text fallback.
 */
export async function retrieveContext(
  query: string,
  mode: ChatMode,
  asOfDate?: string,
  compareDates?: { from: string; to: string },
  topK: number = 5
): Promise<TemporalChunk[]> {
  try {
    let queryEmbedding: number[] = [];

    if (openai) {
      try {
        const res = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query
        });
        queryEmbedding = res.data[0].embedding;
      } catch (err) {
        console.warn('OpenAI embedding call failed, falling back to text match:', err);
      }
    }

    // 2. Route based on mode
    let results: { chunk: TemporalChunk; similarity: number }[] = [];

    if (mode === 'now') {
      results = await VectorStore.search(queryEmbedding, topK, undefined, query);
    } else if (mode === 'time-lens' && asOfDate) {
      results = await VectorStore.search(queryEmbedding, topK, asOfDate, query);
    } else if (mode === 'belief-diff' && compareDates) {
      const res1 = await VectorStore.search(queryEmbedding, Math.ceil(topK / 2), compareDates.from, query);
      const res2 = await VectorStore.search(queryEmbedding, Math.ceil(topK / 2), compareDates.to, query);
      results = [...res1, ...res2].sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    } else {
      results = await VectorStore.search(queryEmbedding, topK, undefined, query);
    }

    // If text match returned low scores, still return top contextual chunks
    if (results.length === 0) {
      results = await VectorStore.search([], topK, asOfDate, query);
    }

    return results.map(r => r.chunk);
  } catch (error) {
    console.error('Error retrieving context:', error);
    return [];
  }
}
