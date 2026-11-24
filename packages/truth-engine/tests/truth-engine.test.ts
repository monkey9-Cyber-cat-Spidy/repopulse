import { describe, it, expect } from 'vitest';
import { extractClaimsFromMarkdown } from '../src/claim-extractor.js';
import { verifyClaimsAgainstAST } from '../src/verifier.js';
import { computeTruthScore } from '../src/scorer.js';
import { generateCharacterizationTest } from '../src/test-generator.js';
import type { RepositoryScanResult } from '@repopulse/scanner';

describe('RepoPulse Documentation Truth Engine', () => {
  it('extracts API route, database, auth, and env variable claims from Markdown', () => {
    const markdown = `
      # Sample App API
      The application runs on PostgreSQL with Prisma ORM.
      Authentication is secured via JWT bearer tokens.

      ## Configuration
      Set \`PORT\` to 3000 and \`DATABASE_URL\` to your connection string.

      ## Routes
      - GET /api/orders
      - POST /api/orders
      - DELETE /api/orders/:id
    `;

    const claims = extractClaimsFromMarkdown(markdown, 'README.md');

    expect(claims.length).toBeGreaterThanOrEqual(5);

    const routes = claims.filter((c) => c.category === 'API_ROUTE');
    expect(routes.map((r) => r.claimedEntity)).toContain('GET /api/orders');
    expect(routes.map((r) => r.claimedEntity)).toContain('POST /api/orders');

    const dbClaims = claims.filter((c) => c.category === 'DATABASE');
    expect(dbClaims.some((d) => d.claimedEntity.includes('POSTGRES'))).toBe(true);

    const authClaims = claims.filter((c) => c.category === 'AUTHENTICATION');
    expect(authClaims.some((a) => a.claimedEntity === 'JWT')).toBe(true);
  });

  it('correctly categorizes verified, outdated, and contradicted claims against AST facts', () => {
    const claims = [
      {
        id: '1',
        sourceDocPath: 'README.md',
        line: 10,
        category: 'API_ROUTE' as const,
        rawText: 'GET /api/orders',
        claimedEntity: 'GET /api/orders'
      },
      {
        id: '2',
        sourceDocPath: 'README.md',
        line: 12,
        category: 'DATABASE' as const,
        rawText: 'Uses MongoDB database',
        claimedEntity: 'MONGODB'
      },
      {
        id: '3',
        sourceDocPath: 'README.md',
        line: 14,
        category: 'ENVIRONMENT' as const,
        rawText: 'Set PORT to 3000',
        claimedEntity: 'PORT'
      },
      {
        id: '4',
        sourceDocPath: 'README.md',
        line: 16,
        category: 'AUTHENTICATION' as const,
        rawText: 'Secured via JWT',
        claimedEntity: 'JWT'
      }
    ];

    const mockScanResult: RepositoryScanResult = {
      scanId: 'test-1',
      repositoryName: 'test-repo',
      rootPath: '/test',
      scannedAt: new Date().toISOString(),
      totalFiles: 5,
      totalLOC: 500,
      entrypoints: ['server.js'],
      files: new Map(),
      allRoutes: [
        {
          id: 'route_1',
          httpMethod: 'GET',
          pathPattern: '/api/orders',
          fullPath: '/api/orders',
          middleware: ['jwtAuthMiddleware'],
          evidence: {
            filePath: 'routes/orders.js',
            startLine: 15,
            endLine: 20,
            startColumn: 0,
            endColumn: 0,
            astNodeType: 'CallExpression.get',
            codeSnippet: "app.get('/api/orders', jwtAuthMiddleware, getOrders);",
            confidence: 1.0
          }
        }
      ],
      allModels: [
        {
          id: 'model_1',
          ormType: 'PRISMA',
          modelName: 'Order',
          fields: [],
          relations: [],
          evidence: {
            filePath: 'prisma/schema.prisma',
            startLine: 5,
            endLine: 10,
            startColumn: 0,
            endColumn: 0,
            astNodeType: 'PrismaModel',
            codeSnippet: 'model Order {}',
            confidence: 1.0
          }
        }
      ],
      allEnvVars: [
        {
          name: 'PORT',
          usageCount: 2,
          defaultValue: '3000',
          locations: [
            {
              filePath: 'server.js',
              startLine: 8,
              endLine: 8,
              startColumn: 0,
              endColumn: 0,
              astNodeType: 'MemberExpression',
              codeSnippet: 'process.env.PORT || 3000',
              confidence: 1.0
            }
          ]
        }
      ],
      allDependencies: [],
      durationMs: 50
    };

    const { verifiedClaims, undocumentedFindings } = verifyClaimsAgainstAST(
      claims,
      mockScanResult
    );

    expect(verifiedClaims).toHaveLength(4);

    // Route was found in code -> VERIFIED
    const routeClaim = verifiedClaims.find((c) => c.category === 'API_ROUTE');
    expect(routeClaim?.status).toBe('VERIFIED');
    expect(routeClaim?.evidence?.filePath).toBe('routes/orders.js');

    // Document claimed MongoDB, but code has Prisma -> CONTRADICTED
    const dbClaim = verifiedClaims.find((c) => c.category === 'DATABASE');
    expect(dbClaim?.status).toBe('CONTRADICTED');

    // Env var was found -> VERIFIED
    const envClaim = verifiedClaims.find((c) => c.category === 'ENVIRONMENT');
    expect(envClaim?.status).toBe('VERIFIED');

    // Auth middleware was found -> VERIFIED
    const authClaim = verifiedClaims.find((c) => c.category === 'AUTHENTICATION');
    expect(authClaim?.status).toBe('VERIFIED');

    // Truth score calculation
    const report = computeTruthScore('test-repo', verifiedClaims, undocumentedFindings);
    expect(report.truthScore).toBeGreaterThan(0);
    expect(report.breakdown.verified).toBe(3);
    expect(report.breakdown.contradicted).toBe(1);
  });

  it('generates behavioral characterization test suites for functions and routes', () => {
    const route = {
      id: 'r1',
      httpMethod: 'POST' as const,
      pathPattern: '/api/checkout',
      fullPath: '/api/checkout',
      middleware: ['auth'],
      evidence: {
        filePath: 'routes/checkout.js',
        startLine: 40,
        endLine: 65,
        startColumn: 0,
        endColumn: 0,
        astNodeType: 'CallExpression.post',
        codeSnippet: "app.post('/api/checkout', checkout);",
        confidence: 1.0
      }
    };

    const testPlan = generateCharacterizationTest(route, 'VITEST');
    expect(testPlan.targetEntity).toBe('POST /api/checkout');
    expect(testPlan.framework).toBe('VITEST');
    expect(testPlan.testCode).toContain("describe('Characterization: POST /api/checkout");
    expect(testPlan.testCode).toContain('request(app)');

    const symbol = {
      id: 's1',
      name: 'calculateTax',
      kind: 'FUNCTION' as const,
      isExported: true,
      isDefaultExport: false,
      evidence: {
        filePath: 'lib/tax.js',
        startLine: 12,
        endLine: 45,
        startColumn: 0,
        endColumn: 0,
        astNodeType: 'FunctionDeclaration',
        codeSnippet: 'function calculateTax() {}',
        confidence: 1.0
      }
    };

    const fnPlan = generateCharacterizationTest(symbol, 'JEST');
    expect(fnPlan.targetEntity).toBe('calculateTax');
    expect(fnPlan.framework).toBe('JEST');
    expect(fnPlan.testCode).toContain('calculateTax');
  });
});
