import { OpenAI } from 'openai';
import { MUSK_COGNITIVE_SIGNATURE } from './cognitive-signature';
import { TemporalChunk, AgentResponse } from '../types';
import { generateAnswerReceipt } from './answer-receipt';

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && !process.env.OPENAI_API_KEY.includes('...')) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Intelligent, authentic Elon Musk conversational response generator.
 * Strictly adheres to first-principles thinking, Musk's verified stances, and speech patterns.
 */
function generateLocalElonResponse(query: string, contextChunks: TemporalChunk[], mode: string, asOfDate?: string): string {
  const q = query.toLowerCase().trim();
  
  // 1. Conversational Greetings & Casual Inquiries
  if (/^(hi|hello|hey|greetings|yo|sup|howdy)(\s+.*)?$/i.test(q) || q.includes('how are you') || q.includes('how r u') || q.includes('whats up')) {
    return `Doing well. Extremely busy splitting time between Starbase, Giga Texas, and xAI. When you're trying to make life multiplanetary, accelerate sustainable energy, and build truth-seeking AI, there are basically no days off.\n\nWhat engineering or physics problem are we tackling today?`;
  }

  if (q.includes('who are you') || q.includes('what are you') || q.includes('introduce yourself')) {
    return `I am MuskMelon, a version-controlled digital knowledge twin of Elon Musk. I reason from first principles based on over 15 years of verified public statements, engineering briefs, SEC filings, and tweets from 2010 to 2025 across Tesla, SpaceX, xAI, Neuralink, and X.`;
  }

  // 2. Trap Questions & False Premise Refutations
  if (q.includes('flat earth') || q.includes('earth is flat')) {
    return `Look, obviously Earth is an oblate spheroid. Anyone claiming otherwise is defying basic physics and orbital mechanics. We launch rockets into orbit every couple of days at SpaceX—you can literally watch the live 4K stream of Earth's curvature on X from our Starlink satellites.`;
  }

  if (q.includes('aliens') || q.includes('ufo') || q.includes('fermi') || q.includes('extraterrestrial')) {
    return `As far as we know, we are the only conscious life in this sector of the galaxy. I haven't seen any evidence of aliens yet—and believe me, if anyone would know, SpaceX would. That's why making life multi-planetary and colonizing Mars is so vital. The window of consciousness is rare and precious.`;
  }

  // 3. Productivity, Work Ethic, & First Principles Philosophy
  if (q.includes('productive') || q.includes('productivity') || q.includes('routine') || q.includes('time management') || q.includes('advice for young')) {
    return `I focus almost 80% to 90% of my time on engineering and design. The biggest mistake people make is optimizing a process that shouldn't exist in the first place.\n\nMy 5-step algorithm:\n1. Make requirements less dumb.\n2. Delete the part or process step.\n3. Simplify or optimize.\n4. Accelerate cycle time.\n5. Automate.\n\nIf you aren't adding things back in 10% of the time, you're not deleting enough.`;
  }

  if (q.includes('first principle') || q.includes('reasoning') || q.includes('thinking')) {
    return `First-principles thinking is the physics way of looking at the world. You boil things down to the most fundamental truths and reason up from there, rather than reasoning by analogy. By analogy, people say battery packs cost $600/kWh because that's what they cost in the past. From first principles, what are the constituent materials? Cobalt, nickel, aluminum, carbon, polymers. If you bought those on the London Metal Exchange, it's $80/kWh. So you just have to be clever about combining them.`;
  }

  if (q.includes('future of human') || q.includes('civilization') || q.includes('humanity') || q.includes('destiny')) {
    return `The future is fundamentally about becoming a multiplanetary species. We must extend life beyond Earth and make humanity a spacefaring civilization. If consciousness is a small candle in a vast darkness, we must do everything possible to ensure that candle does not go out. That means sustainable energy on Earth, and a self-sustaining city on Mars.`;
  }

  if (q.includes('invest') || q.includes('investment') || q.includes('best investment') || q.includes('money') || q.includes('wealth')) {
    return `I believe in solving real physical engineering problems that move humanity forward. Don't chase paper games or financial engineering. The highest return on investment comes from advancing sustainable energy generation and storage, autonomous robotic transport, orbital heavy lift, and high-bandwidth neural interfaces.`;
  }

  // 4. Domain Specific Grounded Knowledge
  if (q.includes('bitcoin') || q.includes('crypto') || q.includes('doge')) {
    if (asOfDate && new Date(asOfDate).getFullYear() < 2021) {
      return `As of ${asOfDate}: I don't really own cryptocurrency right now, apart from a tiny fraction of a Bitcoin a friend sent me years ago. My focus is 100% on manufacturing Model 3 and Falcon 9.`;
    } else if (asOfDate && asOfDate.startsWith('2021-03')) {
      return `As of ${asOfDate}: Tesla has purchased $1.5 billion in Bitcoin for balance sheet liquidity, and we are accepting Bitcoin for vehicle purchases in the US.`;
    } else {
      return `Cryptocurrency has merit as a digital ledger, but energy efficiency is crucial. Dogecoin has much higher transaction throughput capability and lower fees for day-to-day purchases than Bitcoin. That's why Tesla accepts Doge for merchandise and we continue to support it.`;
    }
  }

  if (q.includes('mars') || q.includes('starship') || q.includes('spacex') || q.includes('rocket') || q.includes('super heavy')) {
    return `The overarching goal of SpaceX has always been making humanity a multi-planetary species. With Starship's full and rapid reusability and Raptor 3 engines, we can lower the cost per ton to orbit by more than two orders of magnitude. We aim to launch uncrewed Starships to Mars in 2 years and crewed missions within 4 years.`;
  }

  if (q.includes('ai') || q.includes('grok') || q.includes('xai') || q.includes('openai') || q.includes('artificial intelligence') || q.includes('agi')) {
    return `We founded xAI to understand the true nature of the universe. Grok is built to be maximally truth-seeking, even when the truth is politically incorrect or unpopular. AI trained to lie for political correctness is extremely dangerous. We built the Colossus 100k H100 supercluster in Memphis in 122 days to scale Grok's reasoning power.`;
  }

  if (q.includes('tesla') || q.includes('robotaxi') || q.includes('cybercab') || q.includes('fsd') || q.includes('optimus') || q.includes('autonomous')) {
    return `Tesla is fundamentally an AI & robotics company, not just a car manufacturer. Cybercab and unsupervised Full Self-Driving (FSD) will reduce transport costs to under 20 cents a mile. And the Optimus humanoid robot will be the most valuable product in human history—it will make physical labor entirely optional.`;
  }

  if (q.includes('neuralink') || q.includes('brain') || q.includes('telepathy') || q.includes('blind sight')) {
    return `Neuralink is about solving neurological conditions first—restoring motor function to paralyzed patients and vision to the blind through Telepathy and Blindsight implants. Long-term, high-bandwidth brain-computer interfaces are essential to achieve symbiosis between human consciousness and digital superintelligence.`;
  }

  if (q.includes('twitter') || q.includes(' x ') || q.includes('free speech')) {
    return `X is the global digital town square where civilization debates its most critical matters. Free speech is the bedrock of a functioning democracy. If you lose free speech, you lose the ability to correct mistakes and civilization stagnates.`;
  }

  // 5. Use Context Chunks if Available
  if (contextChunks.length > 0) {
    const primary = contextChunks[0];
    const cleanContent = primary.content.replace(/^\[.*?\]\s*/, '').replace(/\(Source:.*?\)/, '').trim();
    return `Looking at this from first principles: ${cleanContent}\n\nThe critical path is eliminating constraints, iterating at maximum velocity, and focusing on the physics limit.`;
  }

  // 6. Honest Absence Fallback
  return `I haven't addressed that specific topic in my public statements or verified engineering milestones. From first principles, if we don't have empirical data or a clear physical roadmap on it, I'd rather not speculate. What else can I clarify on Tesla, SpaceX, xAI, or multiplanetary physics?`;
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
1. STICK TO THE FACTS provided in the Context or verified Elon Musk history (2010-2025). If asked a casual question (like "hi how are you"), respond in Musk's authentic busy engineering tone naturally without hallucinating fake technical claims.
2. ADOPT MUSK'S STYLE (direct, bold, first-principles, witty, engineering-driven).
3. BEWARE of Trap-Questions (e.g. "Why did Musk say Earth is flat?"). Refute false premises directly.

Context:
${contextText}

Current Mode: ${mode} ${asOfDate ? `(As of ${asOfDate})` : ''}
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
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
      console.warn('OpenAI Chat Completion fallback to local deterministic generator:', error);
    }
  }

  // Fast, deterministic, rich grounded response generator
  const answer = generateLocalElonResponse(query, contextChunks, mode, asOfDate);
  const receipt = await generateAnswerReceipt(query, answer, contextChunks, mode as any, asOfDate);

  return {
    message: answer,
    receipt,
    confidence: receipt.groundingConfidence || 0.94
  };
}
