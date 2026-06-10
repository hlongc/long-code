import { readCodeChunks, type CodeChunk } from "../codeIndexStore.js";

export async function codeSearch(args: { query: string; limit?: number }) {
  const chunks = readCodeChunks();

  if (chunks.length === 0) {
    return "代码索引为空。请先调用 code_index 建立索引。";
  }

  const limit = args.limit || 5;
  const queryTerms = tokenize(args.query);

  const scored = chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryTerms),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) {
    return `没有找到与 "${args.query}" 相关的代码片段。`;
  }

  return scored
    .map(({ chunk, score }, index) => {
      return [
        `## Result ${index + 1}`,
        `score: ${score}`,
        `file: ${chunk.file}`,
        `lines: ${chunk.startLine}-${chunk.endLine}`,
        "",
        "```",
        truncate(chunk.content),
        "```",
      ].join("\n");
    })
    .join("\n\n");
}

function scoreChunk(chunk: CodeChunk, queryTerms: string[]) {
  const text = `${chunk.file}\n${chunk.content}`.toLowerCase();

  let score = 0;

  for (const term of queryTerms) {
    if (!term) continue;

    const count = countOccurrences(text, term);
    score += count;

    if (chunk.file.toLowerCase().includes(term)) {
      score += 5;
    }
  }

  return score;
}

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[\s_\-./:()"'`]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countOccurrences(text: string, term: string) {
  let count = 0;
  let index = text.indexOf(term);

  while (index !== -1) {
    count++;
    index = text.indexOf(term, index + term.length);
  }

  return count;
}

function truncate(text: string) {
  const maxLength = 4000;

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + "\n\n[内容过长，已截断]";
}
