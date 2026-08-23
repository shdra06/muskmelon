import { createCommit } from '../commits/commit-engine';
import { addCommit } from '../commits/commit-store';
import { executeSwytchcodeTool } from './tools';

/**
 * Swytchcode-powered source sync engine for approved Google Drive knowledge documents.
 */
export class SyncEngine {
  /**
   * Sync approved knowledge documents from Google Drive
   */
  static async syncGoogleDrive(query: string = "name contains 'Elon'"): Promise<{ synced: number; commits: string[] }> {
    const result = await executeSwytchcodeTool('googledrive.list_files', { query });
    const commits: string[] = [];

    if (result.success && Array.isArray(result.data)) {
      for (const file of result.data) {
        const fileContent = await executeSwytchcodeTool('googledrive.download_file', { fileId: file.id });
        if (fileContent.success && typeof fileContent.data === 'string') {
          const commit = createCommit(
            fileContent.data,
            file.name || 'Google Drive Document',
            'document',
            file.modifiedTime || new Date().toISOString()
          );
          await addCommit(commit);
          commits.push(commit.id);
        }
      }
    }

    return {
      synced: commits.length,
      commits
    };
  }
}
