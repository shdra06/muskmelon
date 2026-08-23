import { OpenAI } from 'openai';
import crypto from 'node:crypto';
import { KnowledgeCommit, TemporalChunk } from '../types';
import { chunkCommit } from './chunker';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate embeddings using text-embedding-3-small and create TemporalChunks.
 */
export async function createTemporalChunks(commit: KnowledgeCommit): Promise<TemporalChunk[]> {
  const texts = chunkCommit(commit);
  if (texts.length === 0) return [];

  // Batch process in groups of 100
  const BATCH_SIZE = 100;
  const allChunks: TemporalChunk[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batchTexts = texts.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batchTexts,
        encoding_format: 'float'
      });

      batchTexts.forEach((text, index) => {
        allChunks.push({
          id: crypto.randomUUID(),
          content: text,
          embedding: response.data[index].embedding,
          commitId: commit.id,
          validFrom: commit.timestamp,
          validTo: undefined, // undefined = still current
          metadata: {
            source: commit.source,
            sourceType: commit.sourceType,
            topic: commit.topic,
            chunkIndex: i + index
          }
        });
      });
    } catch (error) {
      console.error('Error generating embeddings:', error);
    }
  }

  return allChunks;
}
