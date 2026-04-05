const rules = [
  {
    enabledBy: "block_sql_injection",
    reason: "SQL Injection",
    patterns: [
      /(\bOR\b|\bAND\b)\s+['"]?.+['"]?\s*=\s*['"]?.+['"]?/i,
      /\bUNION\b\s+\bSELECT\b/i,
      /\bSELECT\b.+\bFROM\b/i,
      /\bDROP\b\s+\bTABLE\b/i,
      /\bINSERT\b\s+\bINTO\b/i,
      /--/,
      /\/\*/,
      /;\s*(DROP|DELETE|UPDATE|INSERT|SELECT)\b/i,
    ],
  },
  {
    enabledBy: "block_xss",
    reason: "XSS Payload",
    patterns: [
      /<script\b/i,
      /javascript:/i,
      /\bonerror\s*=/i,
      /\bonload\s*=/i,
      /<img\b[^>]+src=/i,
    ],
  },
  {
    enabledBy: "block_path_traversal",
    reason: "Path Traversal",
    patterns: [
      /\.\.\//,
      /\.\.\\/,
      /\/etc\/passwd/i,
      /boot\.ini/i,
    ],
  },
  {
    enabledBy: "block_command_injection",
    reason: "Command Injection",
    patterns: [
      /\|\s*(cat|type|powershell|bash)\b/i,
      /;\s*(ls|dir|curl|wget|whoami)\b/i,
      /&&\s*(ls|dir|curl|wget|whoami)\b/i,
    ],
  },
];

export function inspectRequest({ config, url, body }) {
  const requestPayload = `${url || ""}\n${body || ""}`;

  for (const rule of rules) {
    if (!config.security[rule.enabledBy]) {
      continue;
    }

    for (const pattern of rule.patterns) {
      if (pattern.test(requestPayload)) {
        return {
          blocked: true,
          reason: rule.reason,
          statusCode: 403,
        };
      }
    }
  }

  return {
    blocked: false,
    reason: "Forwarded",
    statusCode: 200,
  };
}
