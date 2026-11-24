import type { EvidencePointer } from '@repopulse/scanner';

export type C4Level = 1 | 2 | 3 | 4;

export type C4NodeKind =
  | 'SYSTEM'
  | 'CONTAINER'
  | 'COMPONENT'
  | 'CODE'
  | 'EXTERNAL_SERVICE'
  | 'DATABASE'
  | 'ROUTE'
  | 'MODEL'
  | 'MIDDLEWARE';

export interface C4NodeData {
  id: string;
  label: string;
  c4Level: C4Level;
  kind: C4NodeKind;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  loc?: number;
  technologies: string[];
  metrics?: {
    pageRank?: number;
    inDegree?: number;
    outDegree?: number;
  };
  evidence?: EvidencePointer;
}

export type C4EdgeType =
  | 'IMPORTS'
  | 'CALLS'
  | 'MOUNTS_ROUTE'
  | 'USES_MIDDLEWARE'
  | 'QUERIES_MODEL'
  | 'READS_ENV'
  | 'CALLS_EXTERNAL_API';

export interface C4EdgeData {
  id: string;
  source: string;
  target: string;
  type: C4EdgeType;
  label?: string;
  weight?: number;
  isSynchronous?: boolean;
}

export interface ReactFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: C4NodeData;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  animated?: boolean;
  data: C4EdgeData;
}

export interface ReactFlowGraph {
  c4Level: C4Level;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    cyclesDetected: number;
    centralModules: Array<{ id: string; label: string; score: number }>;
  };
}
