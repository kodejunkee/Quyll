/**
 * AI service stub — all methods throw NotImplementedError.
 * This service will be implemented when AI features are added.
 */

class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`AI feature "${feature}" is not yet implemented. Coming soon.`);
    this.name = 'NotImplementedError';
  }
}

export function generateCharacterSuggestion(): never {
  throw new NotImplementedError('Character Assistant');
}

export function expandDescription(): never {
  throw new NotImplementedError('Description Assistant');
}

export function improveDialogue(): never {
  throw new NotImplementedError('Dialogue Assistant');
}

export function brainstormIdeas(): never {
  throw new NotImplementedError('Brainstorm Assistant');
}
