import type { ExtractedClaim } from './types.js';

const ROUTE_REGEX = /\b(GET|POST|PUT|DELETE|PATCH)\s+([/a-zA-Z0-9_:-]+)/g;
const DB_KEYWORDS = ['mongodb', 'mongoose', 'postgresql', 'postgres', 'sqlite', 'prisma', 'sequelize', 'mysql', 'redis'];
const AUTH_KEYWORDS = ['jwt', 'bearer', 'oauth', 'passport', 'session', 'cookie', 'api key'];
const ENV_REGEX = /`?([A-Z][A-Z0-9_]{2,})`?(?:\s*[:=]|\s+for|\s+variable)/g;

/**
 * Extracts verifiable architectural claims from Markdown documentation.
 */
export function extractClaimsFromMarkdown(
  markdownContent: string,
  docPath: string = 'README.md'
): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const lines = markdownContent.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    if (!line || line.startsWith('<!--')) continue;

    // 1. Extract API Route Claims: GET /api/orders
    let routeMatch: RegExpExecArray | null;
    ROUTE_REGEX.lastIndex = 0;
    while ((routeMatch = ROUTE_REGEX.exec(line)) !== null) {
      const method = routeMatch[1].toUpperCase();
      const endpoint = routeMatch[2];
      claims.push({
        id: `CLAIM_ROUTE_${docPath}_L${lineNum}_${method}_${endpoint}`,
        sourceDocPath: docPath,
        line: lineNum,
        category: 'API_ROUTE',
        rawText: line,
        claimedEntity: `${method} ${endpoint}`
      });
    }

    // 2. Extract Database Claims
    const lowerLine = line.toLowerCase();
    for (const db of DB_KEYWORDS) {
      if (lowerLine.includes(db) && !claims.some((c) => c.line === lineNum && c.claimedEntity.toLowerCase() === db)) {
        claims.push({
          id: `CLAIM_DB_${docPath}_L${lineNum}_${db}`,
          sourceDocPath: docPath,
          line: lineNum,
          category: 'DATABASE',
          rawText: line,
          claimedEntity: db.toUpperCase()
        });
      }
    }

    // 3. Extract Authentication Claims
    for (const auth of AUTH_KEYWORDS) {
      if (lowerLine.includes(auth) && !claims.some((c) => c.line === lineNum && c.claimedEntity.toLowerCase() === auth)) {
        claims.push({
          id: `CLAIM_AUTH_${docPath}_L${lineNum}_${auth}`,
          sourceDocPath: docPath,
          line: lineNum,
          category: 'AUTHENTICATION',
          rawText: line,
          claimedEntity: auth.toUpperCase()
        });
      }
    }

    // 4. Extract Environment Variable Claims: `DATABASE_URL`, PORT
    let envMatch: RegExpExecArray | null;
    ENV_REGEX.lastIndex = 0;
    while ((envMatch = ENV_REGEX.exec(line)) !== null) {
      const varName = envMatch[1];
      if (
        !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'README', 'API', 'MIT', 'URL', 'HTTP'].includes(varName) &&
        !claims.some((c) => c.claimedEntity === varName && c.line === lineNum)
      ) {
        claims.push({
          id: `CLAIM_ENV_${docPath}_L${lineNum}_${varName}`,
          sourceDocPath: docPath,
          line: lineNum,
          category: 'ENVIRONMENT',
          rawText: line,
          claimedEntity: varName
        });
      }
    }
  }

  return claims;
}
