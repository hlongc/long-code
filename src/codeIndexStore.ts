export type CodeChunk = {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  content: string;
};

let chunks: CodeChunk[] = [];

export function writeCodeChunks(nextChunks: CodeChunk[]) {
  chunks = nextChunks;
}

export function readCodeChunks() {
  return chunks;
}

export function clearCodeChunks() {
  chunks = [];
}
