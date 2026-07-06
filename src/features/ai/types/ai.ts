/** Future AI module types — interface definitions only for Sprint 1. */

import type { EntityType } from '@/types/common';

/** A request to the AI assistant. */
export interface AiRequest {
  readonly prompt: string;
  readonly context: AiContext;
  readonly module: AiModule;
  readonly maxTokens?: number;
}

/** AI response from Gemini API. */
export interface AiResponse {
  readonly text: string;
  readonly tokensUsed: number;
  readonly model: string;
  readonly timestamp: string;
}

/** Context gathered for an AI request. */
export interface AiContext {
  readonly projectId: string;
  readonly entityType?: EntityType;
  readonly entityId?: string;
  readonly currentChapterId?: string;
  readonly additionalContext?: string;
}

/** Available AI modules. */
export type AiModule =
  | 'character-assistant'
  | 'description-assistant'
  | 'dialogue-assistant'
  | 'brainstorm-assistant'
  | 'context-engine'
  | 'image-generation';
