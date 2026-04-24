import type { IPCResponse, IPCAgentMessage, IPCDayContext } from '../../shared/ipc';
import { getFullContext } from '../db/queries';


interface ValidatedMessage {
  content: string;
  userId: string;
  timestamp: string;
}

interface MessageValidationError {
  field: string;
  reason: string;
}

/*
 * Validates incoming message for safety and format
*/
function validateMessage(message: string): {
  valid: boolean;
  errors: MessageValidationError[];
  validated?: ValidatedMessage;
} {
  const errors: MessageValidationError[] = [];

  // Check message exists
  if (!message) {
    errors.push({ field: 'message', reason: 'Message cannot be empty' });
  }

  // Check message type
  if (typeof message !== 'string') {
    errors.push({ field: 'message', reason: 'Message must be a string' });
  }

  // Check message length (reasonable bounds)
  if (message.length > 5000) {
    errors.push({ field: 'message', reason: 'Message exceeds maximum length (5000 characters)' });
  }

  if (message.length < 1) {
    errors.push({ field: 'message', reason: 'Message must be at least 1 character' });
  }

  // Trim whitespace check
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    errors.push({ field: 'message', reason: 'Message cannot be only whitespace' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Create validated message
  const validated: ValidatedMessage = {
    content: trimmed,
    userId: 'default_user', // TODO: Extract from context once auth is implemented
    timestamp: new Date().toISOString(),
  };

  return { valid: true, errors: [], validated };
}

/**
 * Gets today's context for the agent to process
 * Called by Context Builder in the agent pipeline
 */
function getDayContext(): IPCDayContext {
  const today = new Date().toISOString().split('T')[0];
  return getFullContext(today);
}

/**
 * Main message receiver function
 * 
 * Entry point for all agent messages from the React UI.
 * Validates input, retrieves context, and routes to Context Builder.
 * 
 * @param message - User message from chat interface
 * @returns IPCResponse with agent response or error
 */
export async function receiveMessage(
  message: string,
): Promise<IPCResponse<IPCAgentMessage>> {
  try {
    // STEP 1: Validate input
    const validation = validateMessage(message);
    if (!validation.valid) {
      const errorDetails = validation.errors.map((e) => `${e.field}: ${e.reason}`).join('; ');
      console.warn(`[MessageReceiver] Validation failed: ${errorDetails}`, { message });

      return {
        success: false,
        error: `Invalid message: ${errorDetails}`,
      };
    }

    const validatedMsg = validation.validated;
    if (!validatedMsg) {
      return {
        success: false,
        error: 'Message validation failed',
      };
    }

    console.info(`[MessageReceiver] Message received from user ${validatedMsg.userId}`, {
      length: validatedMsg.content.length,
      timestamp: validatedMsg.timestamp,
    });

    // STEP 2: Get today's context from database
    let context: IPCDayContext;
    try {
      context = getDayContext();
      console.debug('[MessageReceiver] Day context retrieved', {
        tasks: context.tasks.length,
        sessions: context.sessions.length,
        goals: context.goals.length,
        totalMinutes: context.totalMinutes,
      });
    } catch (contextError) {
      console.error('[MessageReceiver] Failed to get day context:', contextError);
      return {
        success: false,
        error: 'Failed to retrieve context for processing',
      };
    }

    // STEP 3: Route to Agent Pipeline
    // The agent pipeline (runAgent) gets its own context internally
    const response = await routeToContextBuilder(validatedMsg);

    console.info('[MessageReceiver] Route complete', {
      action: response.data?.action,
      messageLength: response.data?.reply.length,
    });

    return response;
  } catch (error) {
    console.error('[MessageReceiver] Unhandled error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while processing your message',
    };
  }
}

async function routeToContextBuilder(
  message: ValidatedMessage,
  // context is passed but used internally by agent pipeline
): Promise<IPCResponse<IPCAgentMessage>> {
  try {
    // Import agent pipeline
    const { runAgent } = await import('./agent');

    // Call complete agent pipeline
    const agentResponse = await runAgent(message.content);

    if (!agentResponse.success) {
      console.warn('[MessageReceiver] Agent pipeline failed:', agentResponse.error);
      return agentResponse;
    }

    return agentResponse;
  } catch (error) {
    console.error('[MessageReceiver] Route to context builder failed:', error);
    return {
      success: false,
      error: 'Failed to process message through agent pipeline',
    };
  }
}

// Export functions
export { validateMessage, getDayContext };
