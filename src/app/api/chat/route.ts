import { NextResponse } from 'next/server';
import { PersonaAgent } from '@/lib/agent/persona-agent';

export async function POST(req: Request) {
  try {
    const { message, mode = 'now', asOfDate, compareDates, history = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const mappedMode = mode === 'time' ? 'time-lens' : mode === 'diff' ? 'belief-diff' : 'now';

    const response = await PersonaAgent.chat({
      message,
      mode: mappedMode as any,
      asOfDate,
      compareDates: compareDates ? { from: compareDates[0], to: compareDates[1] } : undefined,
      history
    });

    return NextResponse.json({
      message: response.message,
      receipt: response.receipt,
      confidence: response.confidence
    });
  } catch (error: any) {
    console.error('API /api/chat error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process chat' }, { status: 500 });
  }
}
