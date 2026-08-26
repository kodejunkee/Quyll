import { LocalLinter } from 'harper.js';
import { binaryInlined } from 'harper.js/binaryInlined';

let linter: LocalLinter | null = null;
let initializing = false;

async function getLinter(): Promise<LocalLinter> {
  if (linter) return linter;
  if (initializing) {
    while (!linter) {
      await new Promise(r => setTimeout(r, 50));
    }
    return linter;
  }
  initializing = true;
  try {
    const newLinter = new LocalLinter({ binary: binaryInlined });
    await newLinter.setup();
    linter = newLinter;
  } catch (err) {
    console.error("Failed to initialize harper.js LocalLinter:", err);
    throw err;
  } finally {
    initializing = false;
  }
  return linter;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, text, reqId } = e.data;
  
  if (type === 'LINT') {
    try {
      const harper = await getLinter();
      const lints = await harper.lint(text);
      
      const results = [];
      for (const lint of lints) {
        const span = lint.span();
        const sugs = lint.suggestions();
        const kind = lint.lint_kind();
        const suggestion = sugs && sugs.length > 0 ? sugs[0]?.get_replacement_text() : undefined;
        
        results.push({
          message: lint.message(),
          startOffset: span.start,
          endOffset: span.end,
          kind: kind,
          suggestion
        });
      }
      
      self.postMessage({ type: 'LINT_DONE', reqId, results });
    } catch (err) {
      self.postMessage({ type: 'LINT_ERROR', reqId, error: String(err) });
    }
  }
};
