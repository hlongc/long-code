type CommitMessageArgs = {
  style?: "angular" | "conventional";
  status: string;
  diff: string;
};

type CommitAnalysis = {
  type: string;
  scope: string;
  subject: string;
  body: string[];
};

export async function commitMessage(args: CommitMessageArgs) {
  const style = args.style || "angular";
  const analysis = analyzeCommit(args.status, args.diff);

  const header =
    style === "angular"
      ? `${analysis.type}(${analysis.scope}): ${analysis.subject}`
      : `${analysis.type}: ${analysis.subject}`;

  return [
    "建议 commit message：",
    "",
    header,
    "",
    ...analysis.body.map((item) => `- ${item}`),
  ].join("\n");
}

function analyzeCommit(status: string, diff: string): CommitAnalysis {
  const files = extractChangedFiles(status, diff);
  const fileText = files.join("\n").toLowerCase();
  const diffText = diff.toLowerCase();

  const type = inferType(fileText, diffText);
  const scope = inferScope(fileText, diffText);
  const subject = inferSubject(type, scope, fileText, diffText);
  const body = inferBody(files, diffText);

  return {
    type,
    scope,
    subject,
    body,
  };
}

function extractChangedFiles(status: string, diff: string) {
  const files = new Set<string>();

  for (const line of status.split("\n")) {
    const trimmed = line.trim();

    if (/^(M|A|D|R|C|\?\?)\s+/.test(trimmed)) {
      files.add(trimmed.replace(/^(M|A|D|R|C|\?\?)\s+/, "").trim());
    }
  }

  for (const match of diff.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)) {
    files.add(match[2]);
  }

  return [...files].filter(Boolean);
}

function inferType(fileText: string, diffText: string) {
  // 真正 bug 修复场景
  if (
    fileText.includes("error") ||
    fileText.includes("bug") ||
    diffText.includes("throw new error") ||
    diffText.includes("catch (error)")
  ) {
    return "fix";
  }

  if (
    fileText.includes(".test.") ||
    fileText.includes(".spec.") ||
    fileText.includes("__tests__") ||
    diffText.includes("describe(") ||
    diffText.includes("it(")
  ) {
    return "test";
  }

  if (fileText.includes("readme") || fileText.includes("docs")) {
    return "docs";
  }

  if (diffText.includes("refactor(") || diffText.includes("cleanup")) {
    return "refactor";
  }

  return "feat";
}

function inferScope(fileText: string, diffText: string) {
  if (
    fileText.includes("commitmessage") ||
    diffText.includes("commit_message") ||
    diffText.includes("commit message")
  ) {
    return "tools";
  }

  if (fileText.includes("toolrouter") || diffText.includes("request_tools")) {
    return "agent";
  }

  if (fileText.includes("prompt") || diffText.includes("systemprompt")) {
    return "prompt";
  }

  if (fileText.includes("agentstate") || diffText.includes("agentstate")) {
    return "agent";
  }

  return "agent";
}

function inferSubject(
  type: string,
  scope: string,
  fileText: string,
  diffText: string,
) {
  if (
    scope === "tools" &&
    (diffText.includes("commit_message") ||
      diffText.includes("commit message") ||
      fileText.includes("commitmessage"))
  ) {
    return "support commit message generation from git changes";
  }

  if (scope === "prompt") {
    return "update agent behavior rules";
  }

  if (type === "docs") {
    return "update documentation";
  }

  if (type === "fix") {
    return "fix agent behavior";
  }

  return "improve agent capabilities";
}

function inferBody(files: string[], diffText: string) {
  const body: string[] = [];

  if (files.some((file) => file.includes("commitMessage"))) {
    body.push("add commit message generation tool");
  }

  if (files.some((file) => file.includes("tools/index.ts"))) {
    body.push("register commit_message in tools registry");
  }

  if (files.some((file) => file.includes("toolRouter.ts"))) {
    body.push("enable commit-related tool routing");
  }

  if (files.some((file) => file.includes("prompts.ts"))) {
    body.push("add prompt rule to avoid proactive commit message generation");
  }

  if (diffText.includes("status") && diffText.includes("diff")) {
    body.push("use git status and diff as commit message context");
  }

  return body.length > 0 ? body : ["update agent implementation"];
}
