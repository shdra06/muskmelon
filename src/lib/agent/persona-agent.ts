import { ChatRequest, AgentResponse } from '../types';
import { retrieveContext } from '../rag/retriever';
import { generateGroundedResponse } from '../rag/grounded-generator';

export class PersonaAgent {
  /**
   * Main orchestrator agent supporting THREE MODES: now, time-lens, belief-diff.
   */
  static async chat(request: ChatRequest): Promise<AgentResponse> {
    const contextChunks = await retrieveContext(
      request.message,
      request.mode,
      request.asOfDate,
      request.compareDates,
      5 // topK
    );

    const response = await generateGroundedResponse(
      request.message,
      contextChunks,
      request.mode,
      request.asOfDate
    );

    return response;
  }
}
