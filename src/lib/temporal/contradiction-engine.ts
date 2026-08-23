import { OpenAI } from 'openai';
import { getCommitsByTopic } from '../commits/commit-store';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Detect contradicting statements across time for a topic.
 */
export async function detectContradictions(topic: string) {
  const commits = await getCommitsByTopic(topic);
  if (commits.length < 2) {
    return { contradictions: [] };
  }

  // Sort by date to provide a timeline
  const sorted = commits.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Format history for the LLM
  const historyText = sorted.map(c => `[${c.timestamp}] ${c.content}`).join('\n');

  const prompt = `Analyze the following statements made over time on the topic "${topic}".
Find any semantic contradictions or significant shifts in belief.
If there are contradictions, return them in JSON format as a list of objects with:
- statement1: The earlier statement
- date1: The date of the earlier statement
- statement2: The contradicting later statement
- date2: The date of the later statement

History:
${historyText}

Output strictly valid JSON with a "contradictions" array.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0].message.content || '{"contradictions":[]}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error detecting contradictions:', error);
    return { contradictions: [] };
  }
}
