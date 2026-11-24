/**
 * Core domain types and interfaces for the RepoPulse AST Scanner.
 * Principle: Evidence Before Intelligence — every discovered entity
 * MUST contain an EvidencePointer with exact file and line coordinates.
 */

export interface EvidencePointer {
  filePath: string;
  commitSha?: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  astNodeType: string;
  codeSnippet: string;
  confidence: number; // 1.0 for deterministic AST proof
}

export type SymbolKind =
  | 'FUNCTION'
  | 'CLASS'
  | 'METHOD'
  | 'VARIABLE'
  | 'INTERFACE'
  | 'TYPE_ALIAS'
  | 'EXPRESS_ROUTE'
  | 'EXPRESS_ROUTER'
  | 'MIDDLEWARE'
  | 'ORM_MODEL'
  | 'ENV_VAR';

export interface DiscoveredSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  isExported: boolean;
  isDefaultExport: boolean;
  signature?: string;
  docstring?: string;
  evidence: EvidencePointer;
}

export interface DiscoveredRoute {
  id: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'USE' | 'ALL';
  pathPattern: string;
  rawMountPath?: string;
  fullPath: string;
  handlerSymbol?: string;
  middleware: string[]; // List of middleware function names
  evidence: EvidencePointer;
}

export interface DiscoveredModelField {
  name: string;
  type: string;
  required?: boolean;
  isId?: boolean;
  isUnique?: boolean;
  relationTo?: string;
}

export interface DiscoveredModel {
  id: string;
  ormType: 'PRISMA' | 'MONGOOSE' | 'SEQUELIZE' | 'TYPEORM' | 'CUSTOM';
  modelName: string;
  tableName?: string;
  fields: DiscoveredModelField[];
  relations: Array<{ fromField: string; toModel: string; toField?: string }>;
  evidence: EvidencePointer;
}

export interface DiscoveredEnvVar {
  name: string;
  usageCount: number;
  locations: EvidencePointer[];
  defaultValue?: string;
}

export interface DiscoveredDependency {
  sourceFilePath: string;
  importStatement: string;
  importedNames: string[];
  isDynamic: boolean;
  rawSpecifier: string;
  resolvedFilePath?: string;
  isExternal: boolean;
  evidence: EvidencePointer;
}

export interface FileScanSummary {
  filePath: string;
  relativePath: string;
  language: 'JAVASCRIPT' | 'TYPESCRIPT' | 'JSX' | 'TSX' | 'JSON' | 'MARKDOWN' | 'UNKNOWN';
  loc: number;
  sizeBytes: number;
  sha256Hash: string;
  isEntrypoint: boolean;
  symbols: DiscoveredSymbol[];
  routes: DiscoveredRoute[];
  models: DiscoveredModel[];
  dependencies: DiscoveredDependency[];
  envVars: DiscoveredEnvVar[];
}

export interface RepositoryScanResult {
  scanId: string;
  repositoryName: string;
  rootPath: string;
  commitSha?: string;
  scannedAt: string;
  totalFiles: number;
  totalLOC: number;
  entrypoints: string[];
  files: Map<string, FileScanSummary>;
  allRoutes: DiscoveredRoute[];
  allModels: DiscoveredModel[];
  allEnvVars: DiscoveredEnvVar[];
  allDependencies: DiscoveredDependency[];
  durationMs: number;
}
