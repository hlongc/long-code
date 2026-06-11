import path from "node:path";

export type SensitiveFileDecision =
  | {
      sensitive: false;
    }
  | {
      sensitive: true;
      level: "warning" | "blocked";
      reason: string;
    };

const blockedFileNames = new Set([
  "id_rsa",
  "id_ed25519",
  "id_dsa",
  "id_ecdsa",
]);

const warningFileNames = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  ".npmrc",
  ".pypirc",
  ".netrc",
]);

const warningExtensions = [
  ".pem",
  ".key",
  ".crt",
  ".p12",
  ".pfx",
];

export function inspectSensitiveFile(absPath: string): SensitiveFileDecision {
  const fileName = path.basename(absPath);

  if (blockedFileNames.has(fileName)) {
    return {
      sensitive: true,
      level: "blocked",
      reason: `疑似私钥文件：${fileName}`,
    };
  }

  if (warningFileNames.has(fileName)) {
    return {
      sensitive: true,
      level: "warning",
      reason: `疑似包含密钥或令牌的配置文件：${fileName}`,
    };
  }

  const ext = path.extname(fileName);

  if (warningExtensions.includes(ext)) {
    return {
      sensitive: true,
      level: "warning",
      reason: `疑似证书或密钥文件：${fileName}`,
    };
  }

  return {
    sensitive: false,
  };
}