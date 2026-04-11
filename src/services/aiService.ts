/**
 * Minimal AI Service for Study Agent
 * Uses local Ollama (TinyLLaMA) for:
 * 1. Understanding schedules
 * 2. Tracking progress  
 * 3. Motivation/encouragement
 */

class AIService {
  private ollamaUrl = 'http://localhost:11434';
  private ollamaModel = 'tinyllama';
  private isOllamaAvailable = false;

  /**
   * Check if Ollama is available at localhost:11434
   */
  async checkOllamaAvailability(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout

      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.isOllamaAvailable = response.ok;
      if (this.isOllamaAvailable) {
        console.log('[AIService] ✅ Ollama is available with TinyLLaMA');
      }
      return this.isOllamaAvailable;
    } catch (error) {
      console.log('[AIService] ℹ Ollama not available:', (error as Error).message);
      this.isOllamaAvailable = false;
      return false;
    }
  }

  /**
   * Call Ollama local model
   */
  private async callOllama(prompt: string): Promise<string> {
    if (!this.isOllamaAvailable) {
      throw new Error(
        'Ollama not available. Make sure Ollama is running with tinyllama model.'
      );
    }

    try {
      console.log('[AIService] 🤖 Calling TinyLLaMA...');

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.response || '').trim();
    } catch (error) {
      console.error('[AIService] Ollama call failed:', error);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.isOllamaAvailable;
  }

  /**
   * TASK 1: Understand the study schedule
   * Returns a 1-2 sentence summary of what needs to be done
   */
  async understandSchedule(scheduleText: string): Promise<string> {
    const prompt = `Analyze this study schedule in 2 sentences. What subjects and how long?

${scheduleText}

Respond in 1-2 sentences only.`;

    try {
      const response = await this.callOllama(prompt);
      console.log('[AIService] ✓ Schedule understood');
      return response;
    } catch (error) {
      console.error('[AIService] Failed to understand schedule:', error);
      throw error;
    }
  }

  /**
   * TASK 2: Track progress
   * Returns what to do next based on what's completed
   */
  async getProgress(
    plannedText: string,
    completedText: string
  ): Promise<string> {
    const prompt = `Based on this study plan and completed sessions, what should I do next?

PLAN: ${plannedText}
COMPLETED: ${completedText}

Respond in 1 sentence with the exact next action.`;

    try {
      const response = await this.callOllama(prompt);
      console.log('[AIService] ✓ Progress tracked');
      return response;
    } catch (error) {
      console.error('[AIService] Failed to track progress:', error);
      throw error;
    }
  }

  /**
   * TASK 3: Motivation/encouragement
   * Returns 1-2 sentence encouragement
   */
  async getMotivation(completedCount: number): Promise<string> {
    const prompt = `I've completed ${completedCount} study sessions today. Encourage me in 1-2 sentences.`;

    try {
      const response = await this.callOllama(prompt);
      console.log('[AIService] ✓ Motivation provided');
      return response;
    } catch (error) {
      console.error('[AIService] Failed to get motivation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
