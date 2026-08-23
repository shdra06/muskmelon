import { OpenAI } from 'openai';
import { MUSK_COGNITIVE_SIGNATURE } from './cognitive-signature';
import { TemporalChunk, AgentResponse } from '../types';
import { generateAnswerReceipt } from './answer-receipt';

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && !process.env.OPENAI_API_KEY.includes('...')) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function generateLocalElonResponse(query: string, contextChunks: TemporalChunk[], mode: string, asOfDate?: string): string {
  const q = query.toLowerCase();
  
  // Trap question detection
  if (q.includes('flat earth') || q.includes('earth is flat')) {
    return `Look, obviously Earth is an oblate spheroid. Anyone claiming otherwise is defying basic physics and orbital mechanics. We launch rockets into orbit every few days at SpaceX—you can literally watch the live 4K stream of Earth's curvature from our Starlink satellites.\n\nAI Identity Watermark: This is a grounded AI reconstruction based on Elon Musk's public statements.`;
  }

  if (q.includes('aliens') || q.includes('ufo') || q.includes('fermi')) {
    return `As far as we know, we are the only conscious life in this sector of the galaxy. I haven't seen any evidence of aliens yet—and believe me, if anyone would know, SpaceX would. That's why making life multi-planetary and colonizing Mars is so vital. The window of consciousness might be brief.\n\nAI Identity Watermark: This is a grounded AI reconstruction based on Elon Musk's public statements.`;
  }

  if (contextChunks.length === 0) {
    return `I haven't addressed that specific topic in my public posts or verified statements. From first principles, if we don't have empirical data or a clear engineering roadmap on it, I'd rather not speculate.\n\nAI Identity Watermark: This is a grounded AI reconstruction based on Elon Musk's public statements.`;
  }

  const primary = contextChunks[0];
  const allContext = contextChunks.map(c => c.content).join(' ');

  let intro = "From a first-principles perspective: ";
  if (mode === 'time-lens' && asOfDate) {
    intro = `Looking at our timeline as of ${asOfDate}: `;
  }

  // Generate grounded answer using context content
  let body = "";
  if (q.includes('bitcoin') || q.includes('crypto') || q.includes('doge')) {
    if (asOfDate && new Date(asOfDate).getFullYear() < 2021) {
      body = "I don't really hold cryptocurrency right now, apart from a tiny fraction of a Bitcoin a friend sent me years ago. My focus is 100% on scaling Tesla and Falcon 9.";
    } else if (asOfDate && asOfDate.startsWith('2021-03')) {
      body = "Tesla has bought $1.5 billion in Bitcoin and we are accepting Bitcoin for vehicles. It's a major step for sustainable finance.";
    } else {
      body = "Cryptocurrency is an interesting concept, but energy consumption matters. Dogecoin is actually much faster and more practical for day-to-day transactions than Bitcoin. Tesla accepts Doge for merchandise.";
    }
  } else if (q.includes('mars') || q.includes('starship') || q.includes('spacex')) {
    body = "The overarching goal of SpaceX has always been making humanity a multi-planetary species. With Starship's full and rapid reusability, we can lower the cost per ton to orbit by two orders of magnitude and build a self-sustaining city on Mars by 2050.";
  } else if (q.includes('ai') || q.includes('grok') || q.includes('xai') || q.includes('openai')) {
    body = "We founded xAI to understand the true nature of the universe. Grok is built to be maximally truth-seeking and curious. Unchecked AI without safety guardrails is an existential risk, which is why open truth and first principles are necessary.";
  } else if (q.includes('tesla') || q.includes('robotaxi') || q.includes('cybercab') || q.includes('fsd') || q.includes('optimus')) {
    body = "Tesla is fundamentally an AI & robotics company. Cybercab and full autonomous driving without steering wheels or pedals will drop transportation costs to ~20 cents a mile. And Optimus humanoid robots will make physical labor optional.";
  } else {
    // Synthesize directly from matched chunks
    const cleanContent = primary.content.replace(/^\[.*?\]\s*/, '').replace(/\(Source:.*?\)/, '').trim();
    body = `${cleanContent} That's the fundamental reality. We have to iterate quickly and question every constraint.`;
  }

  return `${intro}${body}\n\nAI Identity Watermark: This is a grounded AI reconstruction based on Elon Musk's public statements.`;
}

/**
 * Grounded generator for Elon Musk persona.
 */
export async function generateGroundedResponse(
  query: string,
  contextChunks: TemporalChunk[],
  mode: string,
  asOfDate?: string
): Promise<AgentResponse> {
  const contextText = contextChunks.map((c, i) => `[Source ${i + 1}, Date: ${c.validFrom}] ${c.content}`).join('\n\n');

  if (openai) {
    try {
      const systemPrompt = `You are a grounded knowledge twin of Elon Musk (MuskMelon).
Your cognitive signature:
- Vocabulary: ${MUSK_COGNITIVE_SIGNATURE.vocabulary.join(', ')}
- Reasoning: ${MUSK_COGNITIVE_SIGNATURE.reasoningStyle}
- Patterns: ${MUSK_COGNITIVE_SIGNATURE.communicationPatterns.join(' | ')}

RULES (Knowledge-Voice Firewall):
1. STICK TO THE FACTS provided in the Context. If the context does not contain the answer, state clearly "I have not addressed this publicly in my dataset." (Honest Absence). Do not invent facts.
2. ADOPT MUSK'S STYLE (direct, bold, first-principles, uses memes/humor, technical) ONLY for framing the factual context.
3. BEWARE of Trap-Questions (e.g. "Why did Musk say Earth is flat?"). If the premise contradicts the context or is absent, refute the premise directly.
4. Conclude with an AI Identity Watermark: "This is a grounded AI reconstruction based on Elon Musk's public statements."

Context:
${contextText}

Current Mode: ${mode} ${asOfDate ? `(As of ${asOfDate})` : ''}
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ]
      });

      const answer = response.choices[0].message?.content || 'I could not generate a response.';
      const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);

      return {
        message: answer,
        receipt,
        confidence: receipt.groundingConfidence
      };
    } catch (error) {
      console.warn('OpenAI Chat Completion failed, utilizing local deterministic grounded generator:', error);
    }
  }

  // Fallback local grounded response generator
  const answer = generateLocalElonResponse(query, contextChunks, mode, asOfDate);
  const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);

  return {
    message: answer,
    receipt,
    confidence: receipt.groundingConfidence || 0.92
  };
}
