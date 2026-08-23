import { OpenAI } from 'openai';
import { getCommitsByTopic, getCommitsByDateRange } from '../commits/commit-store';
import { BeliefDiff } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Compare beliefs between two periods for a given topic.
 */
export async function generateBeliefDiff(topic: string, date1: string, date2: string): Promise<BeliefDiff | null> {
  const allTopicCommits = await getCommitsByTopic(topic);
  
  // Create rough periods (e.g. +/- 30 days around the date)
  const d1Time = new Date(date1).getTime();
  const d2Time = new Date(date2).getTime();
  const range = 30 * 24 * 60 * 60 * 1000;
  
  const period1Commits = allTopicCommits.filter(c => Math.abs(new Date(c.timestamp).getTime() - d1Time) < range);
  const period2Commits = allTopicCommits.filter(c => Math.abs(new Date(c.timestamp).getTime() - d2Time) < range);
  
  if (period1Commits.length === 0 || period2Commits.length === 0) {
    return null;
  }

  const p1Text = period1Commits.map(c => `[${c.timestamp}] ${c.content}`).join('\n');
  const p2Text = period2Commits.map(c => `[${c.timestamp}] ${c.content}`).join('\n');

  const prompt = `Analyze the beliefs on the topic "${topic}" based on statements from two different time periods.

Period 1 (around ${date1}):
${p1Text}

Period 2 (around ${date2}):
${p2Text}

Explain what changed, when it changed, and why it changed.
Provide the output in valid JSON matching this structure:
{
  "topic": "${topic}",
  "period1": { "date": "${date1}", "position": "...", "sources": [] },
  "period2": { "date": "${date2}", "position": "...", "sources": [] },
  "whatChanged": "...",
  "whyChanged": "..."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as BeliefDiff;
  } catch (error) {
    console.error('Error generating belief diff:', error);
    return null;
  }
}
