import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { parse } from '@babel/parser';
// @ts-ignore
import traverseDefault from '@babel/traverse';
import type {
  FileScanSummary,
  RepositoryScanResult,
  DiscoveredRoute,
  DiscoveredModel,
  DiscoveredEnvVar,
  DiscoveredDependency
} from './types.js';
import { redactSecrets } from './redactor.js';
import { extractRoutesFromAST, type SubrouterMount } from './visitors/routeVisitor.js';
import { extractModelsFromAST, extractPrismaModels } from './visitors/modelVisitor.js';
import { extractEnvVarsFromAST } from './visitors/envVisitor.js';
import { extractSymbolsAndDeps } from './visitors/symbolVisitor.js';
import { resolveModulePath, loadPathAliases } from './resolver.js';

// Resolve CJS / ESM import interop for babel traverse
const traverse = (traverseDefault as any).default || traverseDefault;

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.repopulse',
  'coverage',
  '.turbo'
]);

const SCANNABLE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.prisma'
]);

export interface ScanOptions {
  maxFiles?: number;
  verbose?: boolean;
}

/**
 * Scans an entire repository, extracting all AST facts, routes, models, symbols, and dependencies.
 */
export function scanRepository(
  repoRoot: string,
  options: ScanOptions = {}
): RepositoryScanResult {
  const startTime = Date.now();
  const absoluteRoot = path.resolve(repoRoot);
  const repoName = path.basename(absoluteRoot);

  const pathAliases = loadPathAliases(absoluteRoot);
  const filesToScan: string[] = [];

  // Enumerate files
  walkDirectory(absoluteRoot, filesToScan, options.maxFiles || 5000);

  const fileSummaries = new Map<string, FileScanSummary>();
  const allRoutes: DiscoveredRoute[] = [];
  const allModels: DiscoveredModel[] = [];
  const allEnvVarsMap = new Map<string, DiscoveredEnvVar>();
  const allDependencies: DiscoveredDependency[] = [];
  const entrypoints: string[] = [];
  const subrouterMounts: SubrouterMount[] = [];

  let totalLOC = 0;

  for (const filePath of filesToScan) {
    const relativePath = path.relative(absoluteRoot, filePath).replace(/\\/g, '/');
    const ext = path.extname(filePath).toLowerCase();

    // Check entrypoint heuristics
    if (
      relativePath === 'server.js' ||
      relativePath === 'index.js' ||
      relativePath === 'src/index.ts' ||
      relativePath === 'src/server.ts' ||
      relativePath === 'app.js' ||
      relativePath === 'src/app.ts'
    ) {
      entrypoints.push(relativePath);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const loc = lines.length;
    totalLOC += loc;

    const sha256Hash = crypto.createHash('sha256').update(content).digest('hex');

    // Handle Prisma Schema files directly
    if (ext === '.prisma') {
      const models = extractPrismaModels(content, relativePath);
      allModels.push(...models);

      fileSummaries.set(relativePath, {
        filePath,
        relativePath,
        language: 'UNKNOWN',
        loc,
        sizeBytes: Buffer.byteLength(content),
        sha256Hash,
        isEntrypoint: false,
        symbols: [],
        routes: [],
        models,
        dependencies: [],
        envVars: []
      });
      continue;
    }

    // Parse JavaScript / TypeScript AST
    try {
      const isTypeScript = ext === '.ts' || ext === '.tsx';
      const isJSX = ext === '.jsx' || ext === '.tsx';

      const ast = parse(content, {
        sourceType: 'unambiguous',
        plugins: [
          isTypeScript ? 'typescript' : 'flow',
          isJSX ? 'jsx' : 'jsx',
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'dynamicImport',
          'topLevelAwait',
          'nullishCoalescingOperator',
          'optionalChaining'
        ],
        errorRecovery: true,
        tokens: true
      });

      // 1. Extract Routes
      const { routes, mounts } = extractRoutesFromAST(ast, lines, relativePath, traverse);
      allRoutes.push(...routes);
      subrouterMounts.push(...mounts);

      // 2. Extract Models (Mongoose, Sequelize)
      const models = extractModelsFromAST(ast, lines, relativePath, traverse);
      allModels.push(...models);

      // 3. Extract Env Variables
      const envVars = extractEnvVarsFromAST(ast, lines, relativePath, traverse);
      for (const ev of envVars) {
        const existing = allEnvVarsMap.get(ev.name);
        if (existing) {
          existing.usageCount += ev.usageCount;
          existing.locations.push(...ev.locations);
          if (!existing.defaultValue && ev.defaultValue) {
            existing.defaultValue = ev.defaultValue;
          }
        } else {
          allEnvVarsMap.set(ev.name, { ...ev });
        }
      }

      // 4. Extract Symbols and Dependencies
      const { symbols, dependencies } = extractSymbolsAndDeps(
        ast,
        lines,
        relativePath,
        traverse
      );

      // Resolve dependency targets
      for (const dep of dependencies) {
        const resolved = resolveModulePath(
          dep.rawSpecifier,
          filePath,
          absoluteRoot,
          pathAliases
        );
        if (resolved) {
          dep.resolvedFilePath = path.relative(absoluteRoot, resolved).replace(/\\/g, '/');
        }
        allDependencies.push(dep);
      }

      fileSummaries.set(relativePath, {
        filePath,
        relativePath,
        language: isTypeScript ? (isJSX ? 'TSX' : 'TYPESCRIPT') : isJSX ? 'JSX' : 'JAVASCRIPT',
        loc,
        sizeBytes: Buffer.byteLength(content),
        sha256Hash,
        isEntrypoint: entrypoints.includes(relativePath),
        symbols,
        routes,
        models,
        dependencies,
        envVars
      });
    } catch (err) {
      // In errorRecovery mode, severe syntax errors log as unparsed
      if (options.verbose) {
        console.warn(`[repopulse-scanner] Parse warning in ${relativePath}:`, err);
      }
    }
  }

  // Link sub-router mount prefixes to child routes
  linkSubrouterPaths(allRoutes, subrouterMounts);

  return {
    scanId: crypto.randomUUID(),
    repositoryName: repoName,
    rootPath: absoluteRoot,
    scannedAt: new Date().toISOString(),
    totalFiles: fileSummaries.size,
    totalLOC,
    entrypoints,
    files: fileSummaries,
    allRoutes,
    allModels,
    allEnvVars: Array.from(allEnvVarsMap.values()),
    allDependencies,
    durationMs: Date.now() - startTime
  };
}

function walkDirectory(dir: string, fileList: string[], maxFiles: number): void {
  if (fileList.length >= maxFiles) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walkDirectory(path.join(dir, entry.name), fileList, maxFiles);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SCANNABLE_EXTENSIONS.has(ext)) {
        fileList.push(path.join(dir, entry.name));
      }
    }
  }
}

function linkSubrouterPaths(routes: DiscoveredRoute[], mounts: SubrouterMount[]): void {
  for (const mount of mounts) {
    const mountPrefix = mount.mountPath === '/' ? '' : mount.mountPath.replace(/\/$/, '');
    for (const route of routes) {
      // If route is in same file or subroute and starts with /
      if (route.evidence.filePath === mount.evidence.filePath && route.evidence.startLine > mount.evidence.startLine) {
        if (!route.fullPath.startsWith(mountPrefix)) {
          route.fullPath = `${mountPrefix}${route.pathPattern.startsWith('/') ? '' : '/'}${route.pathPattern}`;
        }
      }
    }
  }
}
