import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { topic, date1, date2 } = await req.json();

    const mockDiff = {
      topic,
      period1: {
        start: date1,
        end: '2022-12-31',
        belief: 'AI is dangerous and needs strict regulation before we do anything else.'
      },
      period2: {
        start: date2,
        end: 'Present',
        belief: 'We must build maximum truth-seeking AI to understand the universe safely.'
      },
      explanation: 'The shift reflects a move from purely raising alarms about AI safety to actively building a competing AI company (xAI) with a focus on "maximum truth-seeking" as an alternative approach to safety.'
    };

    return NextResponse.json({ diff: mockDiff });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate diff' }, { status: 500 });
  }
}
