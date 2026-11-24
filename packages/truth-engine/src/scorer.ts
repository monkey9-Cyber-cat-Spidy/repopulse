import type { VerifiedClaim, TruthReport } from './types.js';

/**
 * Computes the repository-wide Documentation Truth Score.
 * Formula from ADR 004 / Stage 2 Architecture Plan:
 * T = (N_verified) / (N_verified + 1.5 * N_contradicted + 0.8 * N_outdated + 0.5 * N_undocumented) * 100%
 */
export function computeTruthScore(
  repoName: string,
  verifiedClaims: VerifiedClaim[],
  undocumentedFindings: Array<{ category: any; description: string; evidence: any }>
): TruthReport {
  let verified = 0;
  let outdated = 0;
  let contradicted = 0;

  for (const claim of verifiedClaims) {
    if (claim.status === 'VERIFIED') verified++;
    else if (claim.status === 'OUTDATED') outdated++;
    else if (claim.status === 'CONTRADICTED') contradicted++;
  }

  const undocumented = undocumentedFindings.length;
  const totalClaims = verifiedClaims.length;

  // Weighted denominator
  const denominator = verified + 1.5 * contradicted + 0.8 * outdated + 0.5 * undocumented;

  let truthScore = 0;
  if (totalClaims === 0 && undocumented === 0) {
    truthScore = 100; // Empty / clean repository
  } else if (denominator > 0) {
    truthScore = Math.round((verified / denominator) * 1000) / 10; // Rounded to 1 decimal place
    // Clamp between 0 and 100
    truthScore = Math.max(0, Math.min(100, truthScore));
  }

  return {
    repositoryName: repoName,
    truthScore,
    breakdown: {
      verified,
      outdated,
      contradicted,
      undocumented,
      totalClaims
    },
    claims: verifiedClaims,
    undocumentedFindings,
    generatedAt: new Date().toISOString()
  };
}
