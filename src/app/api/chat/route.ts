import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, mode, asOfDate, history } = await req.json();

    // Mock response for now
    const responseMessage = mode === 'time' 
      ? `As of ${asOfDate}, my stance on this is based on our progress at Tesla and SpaceX.`
      : `Based on the latest data, this is an incredibly important problem we are solving at xAI.`;

    const mockReceipt = {
      confidence: 0.92,
      sources: [
        { id: '1', date: '2023-10-15', content: 'We must accelerate the transition to sustainable energy.' },
        { id: '2', date: '2023-11-02', content: 'AI is the most powerful tool humanity has created.' }
      ],
      contradictions: []
    };

    return NextResponse.json({
      message: responseMessage,
      receipt: mockReceipt,
      confidence: 0.92
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
