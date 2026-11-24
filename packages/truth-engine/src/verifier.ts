import type { RepositoryScanResult, DiscoveredRoute, DiscoveredModel } from '@repopulse/scanner';
import type { ExtractedClaim, VerifiedClaim, ClaimCategory } from './types.js';

export function verifyClaimsAgainstAST(
  claims: ExtractedClaim[],
  scanResult: RepositoryScanResult
): { verifiedClaims: VerifiedClaim[]; undocumentedFindings: Array<{ category: ClaimCategory; description: string; evidence: any }> } {
  const verifiedClaims: VerifiedClaim[] = [];
  const documentedRoutes = new Set<string>();
  const documentedDbKeywords = new Set<string>();

  for (const claim of claims) {
    switch (claim.category) {
      case 'API_ROUTE': {
        const [method, pathPattern] = claim.claimedEntity.split(' ');
        documentedRoutes.add(`${method} ${pathPattern}`);

        // Search for matching route in scan results
        const matchedRoute = scanResult.allRoutes.find(
          (r) =>
            r.httpMethod === method &&
            (r.fullPath === pathPattern || r.pathPattern === pathPattern || normalizeRoute(r.fullPath) === normalizeRoute(pathPattern))
        );

        if (matchedRoute) {
          verifiedClaims.push({
            ...claim,
            status: 'VERIFIED',
            confidence: 1.0,
            explanation: `Route confirmed in source code at ${matchedRoute.evidence.filePath}:${matchedRoute.evidence.startLine}`,
            evidence: matchedRoute.evidence
          });
        } else {
          // Check if same method exists on similar path
          const similar = scanResult.allRoutes.find((r) => r.httpMethod === method);
          verifiedClaims.push({
            ...claim,
            status: similar ? 'OUTDATED' : 'CONTRADICTED',
            confidence: 0.9,
            explanation: `Route was documented as '${claim.claimedEntity}', but could not be located in AST route tables.`
          });
        }
        break;
      }

      case 'DATABASE': {
        const claimedDb = claim.claimedEntity.toLowerCase();
        documentedDbKeywords.add(claimedDb);

        // Check if any discovered models match this ORM/DB
        const matchingModels = scanResult.allModels.filter((m) =>
          m.ormType.toLowerCase().includes(claimedDb) || claimedDb.includes(m.ormType.toLowerCase())
        );

        // Check if external dependencies include the database driver
        const hasDriver = scanResult.allDependencies.some(
          (d) => d.isExternal && d.rawSpecifier.toLowerCase().includes(claimedDb)
        );

        if (matchingModels.length > 0 || hasDriver) {
          const evidence = matchingModels[0]?.evidence || scanResult.allDependencies.find((d) => d.rawSpecifier.toLowerCase().includes(claimedDb))?.evidence;
          verifiedClaims.push({
            ...claim,
            status: 'VERIFIED',
            confidence: 1.0,
            explanation: `Database technology '${claim.claimedEntity}' verified in source code dependencies/models.`,
            evidence
          });
        } else if (scanResult.allModels.length > 0) {
          // Documented DB X, but AST found models of type Y
          const actualOrm = scanResult.allModels[0].ormType;
          verifiedClaims.push({
            ...claim,
            status: 'CONTRADICTED',
            confidence: 0.95,
            explanation: `Documentation claims '${claim.claimedEntity}', but AST analysis identified models managed by '${actualOrm}'.`,
            evidence: scanResult.allModels[0].evidence
          });
        } else {
          verifiedClaims.push({
            ...claim,
            status: 'OUTDATED',
            confidence: 0.8,
            explanation: `Database technology '${claim.claimedEntity}' was mentioned in documentation, but no matching ORM or driver dependencies were found.`
          });
        }
        break;
      }

      case 'ENVIRONMENT': {
        const varName = claim.claimedEntity;
        const matchedEnv = scanResult.allEnvVars.find((e) => e.name === varName);

        if (matchedEnv && matchedEnv.locations.length > 0) {
          verifiedClaims.push({
            ...claim,
            status: 'VERIFIED',
            confidence: 1.0,
            explanation: `Environment variable '${varName}' is actively read in ${matchedEnv.usageCount} location(s) in source code.`,
            evidence: matchedEnv.locations[0]
          });
        } else {
          verifiedClaims.push({
            ...claim,
            status: 'OUTDATED',
            confidence: 0.85,
            explanation: `Environment variable '${varName}' is documented, but AST analysis found zero usages of process.env.${varName}.`
          });
        }
        break;
      }

      case 'AUTHENTICATION': {
        const authName = claim.claimedEntity.toLowerCase();
        // Check if auth middleware exists in routes
        const authRoute = scanResult.allRoutes.find((r) =>
          r.middleware.some((m) => m.toLowerCase().includes(authName) || m.toLowerCase().includes('auth'))
        );
        const authDep = scanResult.allDependencies.find(
          (d) => d.isExternal && d.rawSpecifier.toLowerCase().includes(authName)
        );

        if (authRoute || authDep) {
          verifiedClaims.push({
            ...claim,
            status: 'VERIFIED',
            confidence: 1.0,
            explanation: `Authentication mechanism '${claim.claimedEntity}' verified via middleware or library dependency.`,
            evidence: authRoute?.evidence || authDep?.evidence
          });
        } else {
          verifiedClaims.push({
            ...claim,
            status: 'OUTDATED',
            confidence: 0.8,
            explanation: `Authentication mechanism '${claim.claimedEntity}' is documented, but no matching middleware or package was detected in AST.`
          });
        }
        break;
      }

      default: {
        verifiedClaims.push({
          ...claim,
          status: 'VERIFIED',
          confidence: 0.7,
          explanation: `General architectural statement.`
        });
      }
    }
  }

  // Detect Undocumented Findings (Critical systems in code not present in documentation)
  const undocumentedFindings: Array<{ category: ClaimCategory; description: string; evidence: any }> = [];

  for (const route of scanResult.allRoutes) {
    const routeKey = `${route.httpMethod} ${route.fullPath}`;
    if (!documentedRoutes.has(routeKey) && route.httpMethod !== 'USE') {
      undocumentedFindings.push({
        category: 'API_ROUTE',
        description: `Undocumented endpoint found in source code: ${route.httpMethod} ${route.fullPath}`,
        evidence: route.evidence
      });
    }
  }

  return { verifiedClaims, undocumentedFindings };
}

function normalizeRoute(pattern: string): string {
  return pattern.replace(/:[a-zA-Z0-9_]+/g, ':id').replace(/\/$/, '');
}
