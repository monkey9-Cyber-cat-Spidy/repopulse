import type { ExtractedClaim } from './types.js';

const ROUTE_REGEX = /\b(GET|POST|PUT|DELETE|PATCH)\s+([/a-zA-Z0-9_:-]+)/g;
const DB_KEYWORDS = ['mongodb', 'mongoose', 'postgresql', 'postgres', 'sqlite', 'prisma', 'sequelize', 'mysql', 'redis'];
const AUTH_KEYWORDS = ['jwt', 'bearer', 'oauth', 'passport', 'session', 'cookie', 'api key'];
// Only match backticked env vars, process.env.X, or UPPER_SNAKE_CASE with underscore
const ENV_BACKTICK_REGEX = /`([A-Z][A-Z0-9_]{2,})`/g;
const ENV_PROCESS_REGEX = /process\.env\.([A-Z][A-Z0-9_]{2,})/g;
const KNOWN_ENV_NAMES = new Set(['PORT', 'HOST', 'NODE_ENV', 'DATABASE_URL', 'MONGO_URI', 'JWT_SECRET', 'API_KEY']);
const IGNORED_UPPER_WORDS = new Set([
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
  'README', 'API', 'MIT', 'URL', 'HTTP', 'HTTPS', 'JSON', 'HTML', 'CSS', 'SQL',
  'VERIFIED', 'OUTDATED', 'CONTRADICTED', 'UNDOCUMENTED', 'FIX', 'NOTE', 'TODO',
  'IMPORTANT', 'WARNING', 'CAUTION', 'TIP', 'STATUS', 'PASS', 'FAIL', 'ERROR',
  'SUCCESS', 'TRUE', 'FALSE', 'NULL', 'PR', 'CI', 'CD', 'CLI', 'AST', 'MCP'
]);

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

    // 4. Extract Environment Variable Claims: `DATABASE_URL`, `PORT`, process.env.X
    let envMatch: RegExpExecArray | null;
    ENV_BACKTICK_REGEX.lastIndex = 0;
    while ((envMatch = ENV_BACKTICK_REGEX.exec(line)) !== null) {
      const varName = envMatch[1];
      if (
        !IGNORED_UPPER_WORDS.has(varName) &&
        (varName.includes('_') || KNOWN_ENV_NAMES.has(varName)) &&
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

    ENV_PROCESS_REGEX.lastIndex = 0;
    while ((envMatch = ENV_PROCESS_REGEX.exec(line)) !== null) {
      const varName = envMatch[1];
      if (
        !IGNORED_UPPER_WORDS.has(varName) &&
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

    // 5. Extract File / Module Architecture Claims: e.g. `server.js`, `lib/pricing.js`, `routes/orders.js`
    const fileRefRegex = /`([a-zA-Z0-9_/-]+\.(?:js|ts|jsx|tsx|prisma))`/g;
    let fileMatch: RegExpExecArray | null;
    while ((fileMatch = fileRefRegex.exec(line)) !== null) {
      const fileRef = fileMatch[1];
      if (!claims.some((c) => c.claimedEntity === fileRef && c.line === lineNum)) {
        claims.push({
          id: `CLAIM_ARCH_${docPath}_L${lineNum}_${fileRef}`,
          sourceDocPath: docPath,
          line: lineNum,
          category: 'ARCHITECTURE',
          rawText: line,
          claimedEntity: fileRef
        });
      }
    }
  }

  return claims;
}
