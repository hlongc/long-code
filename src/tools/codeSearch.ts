import {
  readCodeChunks,
  loadCodeIndexFromDisk,
  type CodeChunk,
} from "../codeIndexStore.js";

const stopWords = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "by",
  "is",
  "are",
  "be",
  "was",
  "were",

  // 常见但区分度低的代码词
  "src",
  "tool",
  "tools",
  "file",
  "files",
  "code",
  "check",
  "system",
  "project",
]);

export async function codeSearch(args: { query: string; limit?: number }) {
  let chunks = readCodeChunks();

  if (chunks.length === 0) {
    const loaded = await loadCodeIndexFromDisk();

    if (loaded) {
      chunks = readCodeChunks();
    }
  }

  if (chunks.length === 0) {
    return "代码索引为空。请先调用 code_index 建立索引。";
  }

  const limit = args.limit || 5;
  const queryTerms = tokenize(args.query);

  const scored = chunks
    .map((chunk) => {
      const detail = scoreChunk(chunk, queryTerms);

      return {
        chunk,
        score: detail.score,
        matchedTerms: detail.matchedTerms,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (scored.length === 0) {
    return `没有找到与 "${args.query}" 相关的代码片段。`;
  }

  return scored
    .map(({ chunk, score, matchedTerms }, index) => {
      return [
        `## Result ${index + 1}`,
        `score: ${score}`,
        `matched: ${matchedTerms.join(", ") || "无"}`,
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
  const file = chunk.file.toLowerCase();
  const content = chunk.content.toLowerCase();
  const text = `${file}\n${content}`;

  let score = 0;
  const matchedTerms = new Set<string>();

  for (const term of queryTerms) {
    if (!term) continue;

    const isStopWord = stopWords.has(term);
    const weight = isStopWord ? 0.3 : 1;

    const contentCount = countOccurrences(content, term);
    const fileCount = countOccurrences(file, term);

    if (contentCount > 0 || fileCount > 0) {
      matchedTerms.add(term);
    }

    // 内容命中：普通加分
    score += contentCount * weight;

    // 文件路径命中：更高加分
    score += fileCount * 8 * weight;

    // 文件名精确命中：最高加分
    const baseName = file.split("/").pop() || "";
    if (baseName.includes(term)) {
      score += 15 * weight;
    }

    // 函数/类型名附近命中：加分
    score += countSymbolHits(content, term) * 5 * weight;
  }

  // 多关键词覆盖率加分
  const nonStopTerms = queryTerms.filter((term) => !stopWords.has(term));
  const coveredNonStopTerms = nonStopTerms.filter((term) =>
    matchedTerms.has(term),
  );

  if (nonStopTerms.length > 0) {
    score += (coveredNonStopTerms.length / nonStopTerms.length) * 10;
  }

  // 特定领域词的文件名偏好
  score += domainBoost(file, queryTerms);

  return {
    score: Math.round(score * 100) / 100,
    matchedTerms: [...matchedTerms],
  };
}

function domainBoost(file: string, queryTerms: string[]) {
  let score = 0;
  const terms = new Set(queryTerms);

  if (
    terms.has("permission") ||
    terms.has("authorization") ||
    terms.has("allow") ||
    terms.has("deny")
  ) {
    if (file.includes("permission")) score += 25;
  }

  if (
    terms.has("dangerous") ||
    terms.has("command") ||
    terms.has("bash") ||
    terms.has("safety") ||
    terms.has("security")
  ) {
    if (file.includes("commandsafety")) score += 30;
    if (file.includes("safebash")) score += 20;
    if (file.includes("bash")) score += 10;
  }

  if (
    terms.has("path") ||
    terms.has("outside") ||
    terms.has("boundary") ||
    terms.has("project")
  ) {
    if (file.includes("pathsecurity")) score += 30;
  }

  if (
    terms.has("sensitive") ||
    terms.has("env") ||
    terms.has("key") ||
    terms.has("secret")
  ) {
    if (file.includes("sensitivefiles")) score += 30;
  }

  return score;
}

function countSymbolHits(content: string, term: string) {
  const patterns = [
    `function ${term}`,
    `const ${term}`,
    `let ${term}`,
    `class ${term}`,
    `type ${term}`,
    `interface ${term}`,
    `export function ${term}`,
    `export const ${term}`,
    `export type ${term}`,
  ];

  return patterns.reduce(
    (count, pattern) => count + countOccurrences(content, pattern),
    0,
  );
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
