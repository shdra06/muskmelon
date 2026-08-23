import { NextResponse } from 'next/server';
import { generateBeliefDiff } from '@/lib/temporal/belief-diff';

export async function POST(req: Request) {
  try {
    const { topic, date1, date2 } = await req.json();

    if (!topic || !date1 || !date2) {
      return NextResponse.json({ error: 'topic, date1, and date2 are required' }, { status: 400 });
    }

    const diff = await generateBeliefDiff(topic, date1, date2);

    return NextResponse.json({ diff });
  } catch (error: any) {
    console.error('API /api/diff error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate diff' }, { status: 500 });
  }
}
