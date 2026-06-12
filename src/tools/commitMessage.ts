type CommitMessageArgs = {
  style?: "angular" | "conventional";
};

export async function commitMessage(args: CommitMessageArgs) {
  const style = args.style || "angular";

  if (style === "angular") {
    return [
      "建议 commit message：",
      "",
      "feat(agent): improve project state inspection",
    ].join("\n");
  }

  return [
    "建议 commit message：",
    "",
    "feat: improve project state inspection",
  ].join("\n");
}
