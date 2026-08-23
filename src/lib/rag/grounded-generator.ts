import { OpenAI } from 'openai';
import { MUSK_COGNITIVE_SIGNATURE, ELON_PROMPT_SYSTEM_INSTRUCTION } from './cognitive-signature';
import { TemporalChunk, AgentResponse, Message } from '../types';
import { generateAnswerReceipt } from './answer-receipt';

/**
 * Returns active OpenAI client if OPENAI_API_KEY is configured
 */
function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (key && key.startsWith('sk-') && !key.includes('...')) {
    return new OpenAI({ apiKey: key });
  }
  return null;
}

/**
 * Call OpenAI API directly (Primary Default Model: GPT-4o / GPT-4o-mini)
 */
async function callOpenAIAPI(systemPrompt: string, userQuery: string, history: Message[] = []): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const formattedHistory = history.slice(-6).map(h => ({
      role: (h.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: h.content
    }));

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: userQuery }
      ]
    });

    return response.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('OpenAI API Error:', error?.message || error);
    // If quota is exhausted or error occurred, rethrow with clear message
    throw new Error(`OpenAI API Error: ${error?.message || 'Failed to complete request'}`);
  }
}

/**
 * Call OpenRouter API if OPENROUTER_API_KEY is configured
 */
async function callOpenRouterAPI(systemPrompt: string, userQuery: string, history: Message[] = []): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey || openRouterKey.includes('...')) return null;

  try {
    const formattedHistory = history.slice(-6).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content
    }));

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://github.com/shdra06/muskmelon',
        'X-Title': 'MuskMelon - Elon Musk Knowledge Twin'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        temperature: 0.6,
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedHistory,
          { role: 'user', content: userQuery }
        ]
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`OpenRouter Error (${res.status}): ${JSON.stringify(errData)}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (error: any) {
    console.error('OpenRouter API Error:', error?.message || error);
    throw error;
  }
}

/**
 * Call Google Gemini LLM API with multi-turn session history
 */
async function callGeminiAPI(systemPrompt: string, userQuery: string, history: Message[] = []): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey || geminiKey.includes('...')) return null;

  try {
    const contents = [
      ...history.slice(-4).map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      { role: 'user', parts: [{ text: userQuery }] }
    ];

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.6 }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Gemini API Error (${res.status}): ${JSON.stringify(errData)}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error: any) {
    console.error('Gemini API Error:', error?.message || error);
    throw error;
  }
}

/**
 * 100% API-Driven Grounded Generator:
 * Exclusively executes live LLM APIs (OpenAI GPT-4o / OpenRouter / Gemini)
 * with Weaviate RAG chunks injected into the prompt.
 * ZERO hardcoded or simulated responses.
 */
export async function generateGroundedResponse(
  query: string,
  contextChunks: TemporalChunk[],
  mode: string,
  asOfDate?: string,
  history: Message[] = []
): Promise<AgentResponse> {
  const contextText = contextChunks.length > 0 
    ? contextChunks.map((c, i) => `[Source ${i + 1}, Date: ${c.validFrom}, Topic: ${c.metadata?.topic || 'general'}] ${c.content}`).join('\n\n')
    : 'No direct historical quote found in the dataset for this query.';

  const systemPrompt = `${ELON_PROMPT_SYSTEM_INSTRUCTION}

## CURRENT VERIFIED RAG KNOWLEDGE CONTEXT (Retrieved from Weaviate):
${contextText}

Current Mode: ${mode} ${asOfDate ? `(As of ${asOfDate})` : ''}
`;

  let lastError: string | null = null;

  // 1. PRIMARY: Call OpenAI API (GPT-4o)
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('...')) {
    try {
      const answer = await callOpenAIAPI(systemPrompt, query, history);
      if (answer) {
        const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);
        return {
          message: answer,
          receipt,
          confidence: receipt.groundingConfidence || 0.95
        };
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  // 2. SECONDARY: Call OpenRouter API
  if (process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('...')) {
    try {
      const answer = await callOpenRouterAPI(systemPrompt, query, history);
      if (answer) {
        const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);
        return {
          message: answer,
          receipt,
          confidence: receipt.groundingConfidence || 0.95
        };
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  // 3. TERTIARY: Call Google Gemini API
  if ((process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && !process.env.GEMINI_API_KEY?.includes('...')) {
    try {
      const answer = await callGeminiAPI(systemPrompt, query, history);
      if (answer) {
        const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);
        return {
          message: answer,
          receipt,
          confidence: receipt.groundingConfidence || 0.95
        };
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  // If all APIs failed or no key is present, report the exact API diagnostic error
  const apiErrorMessage = lastError 
    ? `⚠️ Live LLM API Error: ${lastError}\n\nPlease verify that your OPENAI_API_KEY or OPENROUTER_API_KEY has active billing credits at platform.openai.com.`
    : `⚠️ No Active LLM API Key Configured. Please set OPENAI_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY in .env.local to enable live model generation.`;

  const receipt = await generateAnswerReceipt(query, apiErrorMessage, contextChunks, mode as any, asOfDate);

  return {
    message: apiErrorMessage,
    receipt,
    confidence: 0.0
  };
}
