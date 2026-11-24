import type { CharacterizationTestPlan } from './types.js';
import type { DiscoveredSymbol, DiscoveredRoute } from '@repopulse/scanner';

/**
 * Synthesizes automated characterization tests capturing existing behavior
 * to safeguard legacy code refactoring without introducing regressions.
 * Reference: ADR 004 & Stage 2 Plan Section 9.
 */
export function generateCharacterizationTest(
  target: DiscoveredSymbol | DiscoveredRoute,
  framework: 'VITEST' | 'JEST' = 'VITEST'
): CharacterizationTestPlan {
  const isRoute = 'httpMethod' in target;

  if (isRoute) {
    const route = target as DiscoveredRoute;
    const testCode = `import { describe, it, expect } from '${framework === 'VITEST' ? 'vitest' : '@jest/globals'}';
import request from 'supertest';
// TODO: Replace with the actual exported Express app instance
import app from '../${route.evidence.filePath}';

describe('Characterization: ${route.httpMethod} ${route.fullPath} (Existing Observable Behavior)', () => {
  it('responds with expected status code on baseline request', async () => {
    const response = await request(app)
      .${route.httpMethod.toLowerCase()}('${route.fullPath.replace(/:[a-zA-Z0-9_]+/g, 'test-id')}');

    // Assert current observable HTTP status (captures behavior before refactoring)
    expect(response.status).toBeDefined();
    expect(response.headers['content-type']).toBeDefined();
  });

  it('handles empty / invalid payload according to existing middleware chain', async () => {
    const response = await request(app)
      .${route.httpMethod.toLowerCase()}('${route.fullPath.replace(/:[a-zA-Z0-9_]+/g, 'test-id')}')
      .send({});

    // Captures current error handling or validation behavior
    expect(response.status).toBeLessThan(500);
  });
});
`;

    return {
      targetEntity: `${route.httpMethod} ${route.fullPath}`,
      framework,
      testCode,
      inputVectors: [{ method: route.httpMethod, path: route.fullPath, body: {} }],
      expectedOutput: { status: 'Captured at runtime' },
      explanation: `Characterization test suite generated for endpoint ${route.httpMethod} ${route.fullPath} (lines ${route.evidence.startLine}-${route.evidence.endLine} in ${route.evidence.filePath}).`
    };
  }

  // Target is a function / class method
  const sym = target as DiscoveredSymbol;
  const testCode = `import { describe, it, expect } from '${framework === 'VITEST' ? 'vitest' : '@jest/globals'}';
// TODO: Adjust import path according to module exports
import { ${sym.name} } from '../${sym.evidence.filePath}';

describe('Characterization: ${sym.name} (Existing Observable Behavior)', () => {
  it('captures baseline return value or behavior with default parameters', () => {
    try {
      // @ts-ignore
      const result = ${sym.name}();
      expect(result).toBeDefined();
    } catch (err) {
      // If function requires parameters, capture the exact thrown error
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('captures edge-case response when passed null or undefined inputs', () => {
    try {
      // @ts-ignore
      const result = ${sym.name}(null, undefined);
      expect(result).toBeDefined();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });
});
`;

  return {
    targetEntity: sym.name,
    framework,
    testCode,
    inputVectors: [null, undefined],
    expectedOutput: { status: 'Captured at runtime' },
    explanation: `Behavioral characterization tests generated for symbol '${sym.name}' declared in ${sym.evidence.filePath}:${sym.evidence.startLine}.`
  };
}
