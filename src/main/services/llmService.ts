/**
 * Embedded LLM Service for Electron Main Process
 * Uses node-llama-cpp to run LLM inference locally.
 * 
 * Supports:
 * 1. Loading GGUF model files
 * 2. Generating responses via chat session
 * 3. Fallback to Ollama if embedded model unavailable
 * 4. Proper error handling and lifecycle cleanup
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';

type LlamaRuntime = {
  loadModel: (options: { modelPath: string }) => Promise<{ createContext: () => Promise<{ getSequence: () => unknown; dispose: () => Promise<void> }> ; dispose: () => Promise<void> }>;
  dispose: () => Promise<void>;
};

type LlamaChatSessionRuntime = {
  prompt: (prompt: string, options: { temperature: number; maxTokens: number }) => Promise<string>;
  dispose: () => void;
};

type LlamaModule = {
  getLlama: (options: { maxThreads: number }) => Promise<LlamaRuntime>;
  LlamaChatSession: new (options: { contextSequence: unknown }) => LlamaChatSessionRuntime;
};

export interface LLMGenerationOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

interface LLMInitOptions {
  modelPath?: string;
  nThreads?: number;
}

class EmbeddedLLMService {
  private llama: LlamaRuntime | null = null;
  private model: { createContext: () => Promise<{ getSequence: () => unknown; dispose: () => Promise<void> }>; dispose: () => Promise<void> } | null = null;
  private context: { getSequence: () => unknown; dispose: () => Promise<void> } | null = null;
  private session: LlamaChatSessionRuntime | null = null;
  private isReady = false;
  private modelPath: string | null = null;
  private initError: string | null = null;

  constructor() {
    console.log('[LLMService] Initializing...');
  }

  /**
   * Initialize the LLM with a model file
   * @param options Initialization options
   */
  async initialize(options: LLMInitOptions = {}): Promise<boolean> {
    try {
      if (this.isReady) {
        console.log('[LLMService] Already initialized');
        return true;
      }

      // Determine model path
      let modelPath = options.modelPath;

      if (!modelPath) {
        // Try to find model in app resources
        const possiblePaths = [
          path.join(app.getAppPath(), 'assets', 'models', 'model.gguf'),
          path.join(process.env.APPDATA || '', 'EkagraFocus', 'models', 'model.gguf'),
          path.join(app.getPath('userData'), 'models', 'model.gguf'),
        ];

        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            modelPath = p;
            console.log('[LLMService] Found model at:', modelPath);
            break;
          }
        }
      }

      if (!modelPath || !fs.existsSync(modelPath)) {
        const errorMsg = `Model file not found. Tried: ${modelPath}`;
        console.warn(`[LLMService] ⚠️ ${errorMsg}`);
        this.initError = errorMsg;
        return false;
      }

      this.modelPath = modelPath;

      // Runtime require keeps webpack from bundling all optional platform binaries.
      const runtimeRequire = eval('require') as NodeRequire;
      const llamaModule = runtimeRequire('node-llama-cpp') as LlamaModule;

      // Initialize Llama
      console.log('[LLMService] Loading model from:', modelPath);

      this.llama = await llamaModule.getLlama({
        maxThreads: options.nThreads ?? 4,
      });

      this.model = await this.llama.loadModel({ modelPath });
      this.context = await this.model.createContext();
      this.session = new llamaModule.LlamaChatSession({
        contextSequence: this.context.getSequence(),
      });

      this.isReady = true;
      console.log('[LLMService] ✅ Model loaded successfully');
      console.log('[LLMService] Ready to generate responses');

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LLMService] ❌ Initialization failed:', errorMsg);
      this.initError = errorMsg;
      this.isReady = false;
      return false;
    }
  }

  /**
   * Generate a response using the loaded model
   * @param prompt The prompt to send to the model
   * @param options Generation options
   * @returns Generated text
   */
  async generateResponse(
    prompt: string,
    options: LLMGenerationOptions = {}
  ): Promise<string> {
    if (!this.session || !this.isReady) {
      throw new Error('LLM not initialized. Call initialize() first.');
    }

    try {
      console.debug('[LLMService] Generating response...');
      console.debug('[LLMService] Prompt length:', prompt.length);

      const response = await this.session.prompt(prompt, {
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 512,
      });
      console.debug('[LLMService] Generated response length:', response.length);

      return response.trim();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LLMService] Generation failed:', errorMsg);
      throw error;
    }
  }

  /**
   * Stream responses for real-time output
   * Yields chunks of generated text
   * @param prompt The prompt to send
   * @param options Generation options
   */
  async* streamResponse(
    prompt: string,
    options: LLMGenerationOptions = {}
  ): AsyncGenerator<string> {
    if (!this.session || !this.isReady) {
      throw new Error('LLM not initialized');
    }

    try {
      const fullResponse = await this.generateResponse(prompt, options);
      const chunkSize = 10; // Yield every 10 characters

      for (let i = 0; i < fullResponse.length; i += chunkSize) {
        yield fullResponse.substring(i, i + chunkSize);
      }
    } catch (error) {
      console.error('[LLMService] Streaming failed:', error);
      throw error;
    }
  }

  /**
   * Check if LLM is initialized and ready
   */
  isInitialized(): boolean {
    return this.isReady && this.session !== null;
  }

  /**
   * Get initialization status and error details
   */
  getStatus() {
    return {
      initialized: this.isReady,
      modelPath: this.modelPath,
      error: this.initError,
      ready: this.isReady,
    };
  }

  /**
   * Shutdown the LLM service
   */
  async shutdown(): Promise<void> {
    console.log('[LLMService] Shutting down');

    try {
      this.session?.dispose();
    } catch {
      // ignore session disposal issues
    }

    try {
      if (this.context) {
        await this.context.dispose();
      }
    } catch {
      // ignore context disposal issues
    }

    try {
      if (this.model) {
        await this.model.dispose();
      }
    } catch {
      // ignore model disposal issues
    }

    try {
      if (this.llama) {
        await this.llama.dispose();
      }
    } catch {
      // ignore llama disposal issues
    }

    this.isReady = false;
    this.session = null;
    this.context = null;
    this.model = null;
    this.llama = null;
  }
}

// Try to generate response via Ollama (fallback)
export async function generateViaOllama(
  prompt: string,
  model = 'tinyllama'
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    console.debug('[LLMService] Trying Ollama fallback...');

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        temperature: 0.7,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    const generated = data.response || '';

    console.debug('[LLMService] Ollama response received, length:', generated.length);
    return generated.trim();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.debug('[LLMService] Ollama fallback failed:', errorMsg);
    return null;
  }
}

// Export singleton instance
export const llmService = new EmbeddedLLMService();

export default llmService;
