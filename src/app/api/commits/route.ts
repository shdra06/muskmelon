import { NextResponse } from 'next/server';
import { getAllCommits, getCommitsByTopic, getCommitsByDateRange, getCommitTimeline, getStats } from '@/lib/commits/commit-store';

/**
 * GET /api/commits
 * Retrieve real Knowledge Commits from the commit store.
 * Query params: ?topic=AI&from=2023-01-01&to=2024-01-01&timeline=true&stats=true
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const showTimeline = searchParams.get('timeline') === 'true';
    const showStats = searchParams.get('stats') === 'true';

    if (showStats) {
      const stats = await getStats();
      return NextResponse.json({ stats });
    }

    if (showTimeline) {
      const timeline = await getCommitTimeline();
      return NextResponse.json({
        commits: timeline.map(c => ({
          id: c.id,
          date: c.timestamp,
          topic: c.topic,
          source: c.source,
          sourceType: c.sourceType,
          excerpt: c.content.substring(0, 150) + (c.content.length > 150 ? '...' : '')
        }))
      });
    }

    let commits;
    if (topic) {
      commits = await getCommitsByTopic(topic);
    } else if (from && to) {
      commits = await getCommitsByDateRange(from, to);
    } else {
      commits = await getAllCommits();
    }

    return NextResponse.json({
      total: commits.length,
      commits: commits.map(c => ({
        id: c.id,
        date: c.timestamp,
        topic: c.topic,
        source: c.source,
        sourceType: c.sourceType,
        excerpt: c.content.substring(0, 150) + (c.content.length > 150 ? '...' : '')
      }))
    });
  } catch (error: unknown) {
    console.error('Commits API error:', error);
    return NextResponse.json({ error: 'Failed to fetch commits' }, { status: 500 });
  }
}
