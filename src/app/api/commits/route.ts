import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // Filtering logic...

    return NextResponse.json({
      commits: [
        { id: '1', date: '2023-11-20', topic: 'ai', source: 'Twitter', excerpt: 'xAI Grok is now available...' },
        { id: '2', date: '2023-10-15', topic: 'tesla', source: 'Earnings Call', excerpt: 'FSD V12 is entirely end-to-end AI...' }
      ]
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch commits' }, { status: 500 });
  }
}
