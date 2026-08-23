import { SwytchcodeTool, ToolResult } from '../types';

/**
 * Mock fallback executions for Swytchcode tools
 */
const mockExecute = async (input: Record<string, unknown>): Promise<ToolResult> => {
  return { success: true, data: { status: 'mock_success', input } };
};

export const tools: Record<string, SwytchcodeTool> = {
  googleDrive: {
    name: 'google_drive_list',
    description: 'List files in Google Drive',
    inputSchema: { q: 'string' },
    execute: mockExecute
  },
  notion: {
    name: 'notion_search',
    description: 'Search Notion pages',
    inputSchema: { query: 'string' },
    execute: mockExecute
  },
  github: {
    name: 'github_search_repos',
    description: 'Search GitHub repositories',
    inputSchema: { q: 'string' },
    execute: mockExecute
  },
  youtube: {
    name: 'youtube_captions',
    description: 'Pull YouTube video captions',
    inputSchema: { videoId: 'string' },
    execute: mockExecute
  },
  gmail: {
    name: 'gmail_search',
    description: 'Search Gmail messages',
    inputSchema: { q: 'string' },
    execute: mockExecute
  },
  slack: {
    name: 'slack_search',
    description: 'Search Slack messages',
    inputSchema: { query: 'string' },
    execute: mockExecute
  },
  telegram: {
    name: 'telegram_get_messages',
    description: 'Get Telegram messages',
    inputSchema: { chatId: 'string' },
    execute: mockExecute
  },
  resend: {
    name: 'resend_send_email',
    description: 'Send email via Resend',
    inputSchema: { to: 'string', subject: 'string', html: 'string' },
    execute: mockExecute
  },
  firecrawl: {
    name: 'firecrawl_scrape',
    description: 'Scrape webpage',
    inputSchema: { url: 'string' },
    execute: mockExecute
  },
  googleCalendar: {
    name: 'gcal_list_events',
    description: 'List Calendar events',
    inputSchema: { timeMin: 'string' },
    execute: mockExecute
  }
};
