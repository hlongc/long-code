export type CommandSafetyDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason: string;
      pattern: string;
    };

export const dangerousCommandPatterns = [
  "rm ",
  "rm -rf",
  "rimraf",
  "rmdir",
  "Remove-Item",
  "fs.rm",
  "rmSync",
  "unlink",
  "unlinkSync",

  "sudo",
  "mkfs",
  "dd ",
  ":(){",
  "chmod -R 777",

  "git push",
  "git reset --hard",
  "git clean -fd",

  "curl ",
  "wget ",
];

export function checkDangerousCommand(command: string): CommandSafetyDecision {
  for (const pattern of dangerousCommandPatterns) {
    if (command.includes(pattern)) {
      return {
        allowed: false,
        pattern,
        reason: `命中危险命令规则：${pattern}`,
      };
    }
  }

  return {
    allowed: true,
  };
}
