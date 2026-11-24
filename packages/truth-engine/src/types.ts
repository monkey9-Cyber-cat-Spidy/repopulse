import type { EvidencePointer } from '@repopulse/scanner';

export type ClaimCategory =
  | 'API_ROUTE'
  | 'DATABASE'
  | 'AUTHENTICATION'
  | 'ARCHITECTURE'
  | 'ENVIRONMENT';

export type ClaimStatus = 'VERIFIED' | 'OUTDATED' | 'CONTRADICTED' | 'UNDOCUMENTED';

export interface ExtractedClaim {
  id: string;
  sourceDocPath: string;
  line: number;
  category: ClaimCategory;
  rawText: string;
  claimedEntity: string; // e.g. "POST /api/orders", "MongoDB", "PORT"
}

export interface VerifiedClaim extends ExtractedClaim {
  status: ClaimStatus;
  confidence: number;
  explanation: string;
  evidence?: EvidencePointer;
}

export interface TruthReport {
  repositoryName: string;
  truthScore: number; // 0 to 100%
  breakdown: {
    verified: number;
    outdated: number;
    contradicted: number;
    undocumented: number;
    totalClaims: number;
  };
  claims: VerifiedClaim[];
  undocumentedFindings: Array<{
    category: ClaimCategory;
    description: string;
    evidence: EvidencePointer;
  }>;
  generatedAt: string;
}

export interface CharacterizationTestPlan {
  targetEntity: string;
  framework: 'VITEST' | 'JEST';
  testCode: string;
  inputVectors: any[];
  expectedOutput: any;
  explanation: string;
}
