const alwaysAllowedPermissions = new Set<string>();

export function createPermissionKey(toolName: string, args: unknown) {
  return `${toolName}:${normalizeArgs(args)}`;
}

export function allowPermissionForSession(toolName: string, args: unknown) {
  alwaysAllowedPermissions.add(createPermissionKey(toolName, args));
}

export function isPermissionAllowedForSession(toolName: string, args: unknown) {
  return alwaysAllowedPermissions.has(createPermissionKey(toolName, args));
}

function normalizeArgs(args: unknown) {
  return stableStringify(args);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
