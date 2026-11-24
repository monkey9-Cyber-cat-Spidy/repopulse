/**
 * Deterministic Credential & Secret Scrubbing Engine.
 * Enforces security boundary: No secrets or raw API tokens may leak into
 * evidence snippets, stored audit logs, or LLM prompts.
 * Reference: ADR 005 (Sandboxed Static Parsing & Credential Redaction).
 */

export interface RedactionResult {
  sanitizedText: string;
  redactedCount: number;
  redactionsFound: Array<{
    type: string;
    index: number;
  }>;
}

const REDACTION_PATTERNS: Array<{ type: string; regex: RegExp }> = [
  // Private Key Blocks
  {
    type: 'PRIVATE_KEY',
    regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi
  },
  // AWS Access Keys
  {
    type: 'AWS_ACCESS_KEY',
    regex: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g
  },
  // GitHub Tokens
  {
    type: 'GITHUB_PAT',
    regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/g
  },
  // Stripe Secret Keys
  {
    type: 'STRIPE_SECRET_KEY',
    regex: /sk_(?:live|test)_[0-9a-zA-Z]{24,99}/g
  },
  // JWT Tokens (Header.Payload.Signature)
  {
    type: 'JWT_TOKEN',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g
  },
  // Generic password assignments: password = '...', secret: "...", token: '...'
  // Excludes values already redacted
  {
    type: 'ASSIGNED_SECRET',
    regex: /(?<=\b(?:password|passwd|secret|api_key|apikey|auth_token|access_token|private_key)\s*[:=]\s*['"])(?!\[REDACTED_SECRET)[^'"\r\n]{4,}(?=['"])/gi
  },
  // Slack / Discord Webhook URLs
  {
    type: 'WEBHOOK_URL',
    regex: /https:\/\/(?:hooks\.slack\.com\/services|discord\.com\/api\/webhooks)\/[A-Za-z0-9_/-]+/gi
  }
];

/**
 * Sanitizes input source code or text snippets, replacing any matched secrets
 * with a standardized redaction placeholder: [REDACTED_SECRET: <TYPE>].
 */
export function redactSecrets(rawText: string): RedactionResult {
  if (!rawText) {
    return { sanitizedText: '', redactedCount: 0, redactionsFound: [] };
  }

  let sanitized = rawText;
  let count = 0;
  const found: Array<{ type: string; index: number }> = [];

  for (const { type, regex } of REDACTION_PATTERNS) {
    // Reset stateful regex
    regex.lastIndex = 0;
    sanitized = sanitized.replace(regex, (match, offset) => {
      count++;
      found.push({ type, index: offset });
      return `[REDACTED_SECRET: ${type}]`;
    });
  }

  return {
    sanitizedText: sanitized,
    redactedCount: count,
    redactionsFound: found
  };
}

/**
 * Helper to produce a safe snippet for an evidence pointer.
 */
export function extractSafeSnippet(
  sourceLines: string[],
  startLine: number,
  endLine: number,
  maxLines: number = 25
): string {
  // Line numbers are 1-based
  const zeroBasedStart = Math.max(0, startLine - 1);
  const zeroBasedEnd = Math.min(sourceLines.length, Math.max(zeroBasedStart + 1, endLine));
  
  const slice = sourceLines.slice(zeroBasedStart, zeroBasedEnd);
  if (slice.length > maxLines) {
    const truncated = slice.slice(0, maxLines);
    truncated.push(`... [${slice.length - maxLines} lines truncated for brevity]`);
    return redactSecrets(truncated.join('\n')).sanitizedText;
  }

  return redactSecrets(slice.join('\n')).sanitizedText;
}
