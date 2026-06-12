import {
  getCodeIndexStatus,
  inspectCodeIndexFreshness,
} from "../codeIndexStore.js";

export async function codeIndexStatus() {
  const status = await getCodeIndexStatus();
  const freshness = await inspectCodeIndexFreshness();

  if (!status.exists) {
    return [
      "代码索引不存在。",
      `索引文件：${status.indexFile}`,
      "请先调用 code_index 建立索引。",
    ].join("\n");
  }

  return [
    freshness.fresh
      ? "代码索引已存在，且是最新的。"
      : "代码索引已存在，但已过期。",
    `索引文件：${status.indexFile}`,
    `创建时间：${status.createdAt}`,
    `代码片段数量：${status.chunks}`,
    `项目根目录：${status.projectRoot}`,
    "",
    `状态：${freshness.reason}`,
    freshness.changedFiles.length
      ? `修改文件：${freshness.changedFiles.slice(0, 20).join(", ")}`
      : "",
    freshness.addedFiles.length
      ? `新增文件：${freshness.addedFiles.slice(0, 20).join(", ")}`
      : "",
    freshness.deletedFiles.length
      ? `删除文件：${freshness.deletedFiles.slice(0, 20).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
