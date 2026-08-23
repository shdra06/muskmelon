import { SwytchcodeTool, ToolResult } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** Check if Swytchcode CLI is accessible */
async function isSwytchcodeAvailable(): Promise<boolean> {
  try {
    await execAsync('swy.cmd --version || swy --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute a Swytchcode tool via the runtime execution pipeline.
 * Swytchcode evaluates policies from .swytchcode/integrations/policies.json,
 * resolves managed authentication, handles retries, and records execution metadata.
 */
export async function executeSwytchcodeTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  const isAvailable = await isSwytchcodeAvailable();

  if (!isAvailable) {
    return {
      success: false,
      error: `Swytchcode CLI/Runtime not detected. Ensure 'npm install -g swytchcode' is installed and 'swy login' has been executed.`
    };
  }

  try {
    const inputJson = JSON.stringify(input);
    const cmd = `swy.cmd exec ${toolName} "${inputJson.replace(/"/g, '\\"')}"`;

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 30000,
      env: {
        ...process.env,
        SWYTCHCODE_TOKEN: process.env.SWYTCHCODE_TOKEN || ''
      }
    });

    if (stderr && !stdout) {
      return { success: false, error: stderr };
    }

    try {
      const parsed = JSON.parse(stdout);
      return { success: true, data: parsed };
    } catch {
      return { success: true, data: stdout.trim() };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Execution error in Swytchcode pipeline'
    };
  }
}

/**
 * Core Swytchcode tools for MindCommit:
 * 1. Google Drive: Approved document and knowledge ingestion.
 * 2. Telegram: Authorized subscriber access channel.
 * 3. Slack: Authorized workspace twin Q&A.
 */
export function getSwytchcodeTools(): SwytchcodeTool[] {
  return [
    {
      name: 'googledrive.list_files',
      description: 'List approved documents and files in Google Drive for knowledge commit creation.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term or query filter' }
        }
      },
      execute: async (input) => executeSwytchcodeTool('googledrive.list_files', input)
    },
    {
      name: 'googledrive.download_file',
      description: 'Download file content from Google Drive for vectorization.',
      inputSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'Google Drive file ID' }
        },
        required: ['fileId']
      },
      execute: async (input) => executeSwytchcodeTool('googledrive.download_file', input)
    },
    {
      name: 'telegram.send_message',
      description: 'Send grounded answer receipt to verified Telegram chat (Policy: Requires approval).',
      inputSchema: {
        type: 'object',
        properties: {
          chat_id: { type: 'string', description: 'Target Telegram chat ID' },
          text: { type: 'string', description: 'Message content' }
        },
        required: ['chat_id', 'text']
      },
      execute: async (input) => executeSwytchcodeTool('telegram.send_message', input)
    },
    {
      name: 'slack.post_message',
      description: 'Post verified knowledge response to Slack channel (Policy: Rate-limited).',
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Slack channel' },
          text: { type: 'string', description: 'Message content' }
        },
        required: ['channel', 'text']
      },
      execute: async (input) => executeSwytchcodeTool('slack.post_message', input)
    }
  ];
}

export async function getToolStatus(): Promise<{
  cliAvailable: boolean;
  tools: { name: string; description: string; status: string }[];
}> {
  const cliAvailable = await isSwytchcodeAvailable();
  const tools = getSwytchcodeTools().map(tool => ({
    name: tool.name,
    description: tool.description,
    status: cliAvailable ? 'connected' : 'unconfigured'
  }));

  return { cliAvailable, tools };
}
