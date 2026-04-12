declare module 'node-llama-cpp' {
  export type Llama = any;
  export type LlamaModel = any;
  export type LlamaContext = any;

  export function getLlama(options?: any): Promise<any>;

  export class LlamaChatSession {
    constructor(options: any);
    prompt(prompt: string, options?: any): Promise<string>;
    dispose(): void;
  }
}
