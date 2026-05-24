/// <reference types="node" />
/**
 * Inference adapter — optional module.
 *
 * Modes:
 * - mock: returns stub responses (default, no dependencies)
 * - local: assumes Ollama-compatible HTTP endpoint (http://localhost:11434)
 *   - CPU-only is supported but experimental/slow
 *   - Does NOT bundle model weights
 *   - Does NOT require GPU
 * - remote: delegates to a remote inference API
 *
 * IMPORTANT: API server never runs heavy inference inline.
 * Inference is always enqueued as a job and processed by a worker.
 *
 * Resource limits (Docker Compose inference profile):
 *   cpus: 4, mem_limit: 12g
 */

export type InferenceMode = 'mock' | 'local' | 'remote';

export interface GenerateTextInput {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateTextResult {
  text: string;
  model: string;
  mode: InferenceMode;
}

export interface GenerateEmbeddingInput {
  text: string;
  model?: string;
}

export interface GenerateEmbeddingResult {
  embedding: number[];
  model: string;
  mode: InferenceMode;
}

export interface ClassifyInput {
  text: string;
  labels: string[];
  model?: string;
}

export interface ClassifyResult {
  label: string;
  score: number;
  mode: InferenceMode;
}

export interface InferenceClient {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateEmbedding(input: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult>;
  classify(input: ClassifyInput): Promise<ClassifyResult>;
}

// ---- Mock client ----

export class MockInferenceClient implements InferenceClient {
  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    return {
      text: `[mock] Echo: ${input.prompt}`,
      model: input.model ?? 'mock',
      mode: 'mock',
    };
  }

  async generateEmbedding(input: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult> {
    // Return a deterministic stub embedding
    const embedding = Array.from({ length: 384 }, (_, i) =>
      Math.sin(i + input.text.length)
    );
    return { embedding, model: input.model ?? 'mock', mode: 'mock' };
  }

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    return {
      label: input.labels[0] ?? 'unknown',
      score: 1.0,
      mode: 'mock',
    };
  }
}

// ---- Local (Ollama-compatible) client ----

export class LocalInferenceClient implements InferenceClient {
  private baseUrl: string;
  private model: string;
  private embeddingModel: string;
  private timeoutMs: number;

  constructor(opts?: {
    baseUrl?: string;
    model?: string;
    embeddingModel?: string;
    timeoutMs?: number;
  }) {
    this.baseUrl = opts?.baseUrl ?? process.env['INFERENCE_BASE_URL'] ?? 'http://localhost:11434';
    this.model = opts?.model ?? process.env['INFERENCE_MODEL'] ?? 'llama3.2';
    this.embeddingModel =
      opts?.embeddingModel ?? process.env['INFERENCE_EMBEDDING_MODEL'] ?? 'nomic-embed-text';
    this.timeoutMs = opts?.timeoutMs ?? Number(process.env['INFERENCE_TIMEOUT_MS'] ?? 120000);
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const model = input.model ?? this.model;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          stream: false,
          options: {
            num_predict: input.maxTokens ?? 512,
            temperature: input.temperature ?? 0.7,
          },
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Ollama generateText failed: ${res.status}`);
      const data = await res.json() as { response: string };
      return { text: data.response, model, mode: 'local' };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateEmbedding(input: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult> {
    const model = input.model ?? this.embeddingModel;
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: input.text }),
    });
    if (!res.ok) throw new Error(`Ollama generateEmbedding failed: ${res.status}`);
    const data = await res.json() as { embedding: number[] };
    return { embedding: data.embedding, model, mode: 'local' };
  }

  async classify(_input: ClassifyInput): Promise<ClassifyResult> {
    // TODO: Implement with embedding similarity or local classifier model
    throw new Error('LocalInferenceClient.classify: not yet implemented');
  }
}

// ---- Factory ----

export function createInferenceClient(mode?: InferenceMode): InferenceClient {
  const resolvedMode: InferenceMode =
    mode ?? (process.env['INFERENCE_MODE'] as InferenceMode) ?? 'mock';
  switch (resolvedMode) {
    case 'mock':
      return new MockInferenceClient();
    case 'local':
      return new LocalInferenceClient();
    case 'remote':
      // TODO: Implement remote inference client
      throw new Error('Remote inference client not yet implemented');
    default:
      return new MockInferenceClient();
  }
}
