declare module 'node-llama-cpp' {
  export type Llama = unknown;
  export type LlamaModel = unknown;
  export type LlamaContext = unknown;

  export function getLlama(options?: Record<string, unknown>): Promise<unknown>;

  export class LlamaChatSession {
    constructor(options: Record<string, unknown>);
    prompt(prompt: string, options?: Record<string, unknown>): Promise<string>;
    dispose(): void;
  }
}
