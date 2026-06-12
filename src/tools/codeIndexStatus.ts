import { getCodeIndexStatus } from "../codeIndexStore.js";

export async function codeIndexStatus() {
  const status = await getCodeIndexStatus();

  if (!status.exists) {
    return [
      "代码索引不存在。",
      `索引文件：${status.indexFile}`,
      "请先调用 code_index 建立索引。",
    ].join("\n");
  }

  return [
    "代码索引已存在。",
    `索引文件：${status.indexFile}`,
    `创建时间：${status.createdAt}`,
    `代码片段数量：${status.chunks}`,
    `项目根目录：${status.projectRoot}`,
  ].join("\n");
}
