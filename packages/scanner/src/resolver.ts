import * as fs from 'node:fs';
import * as path from 'node:path';

const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

/**
 * Resolves a module specifier to an absolute filesystem path within the repo boundary.
 * Supports relative imports (./foo, ../bar), index resolution, and tsconfig paths.
 */
export function resolveModulePath(
  specifier: string,
  fromFilePath: string,
  repoRoot: string,
  pathAliases: Record<string, string[]> = {}
): string | undefined {
  // If external package (e.g. 'express', 'react'), return undefined
  if (!specifier.startsWith('.') && !specifier.startsWith('/') && !isAliased(specifier, pathAliases)) {
    return undefined;
  }

  const fromDir = path.dirname(fromFilePath);
  let candidatePath: string;

  if (specifier.startsWith('.')) {
    candidatePath = path.resolve(fromDir, specifier);
  } else if (specifier.startsWith('/')) {
    candidatePath = path.resolve(repoRoot, specifier.slice(1));
  } else {
    // Try resolving path alias
    const resolvedAlias = resolveAlias(specifier, repoRoot, pathAliases);
    if (!resolvedAlias) return undefined;
    candidatePath = resolvedAlias;
  }

  // Security check: ensure candidatePath stays within repoRoot
  const normalizedRoot = path.resolve(repoRoot);
  const normalizedCandidate = path.resolve(candidatePath);
  if (!normalizedCandidate.startsWith(normalizedRoot)) {
    return undefined; // Path traversal attempt blocked
  }

  // 1. Direct file match
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return candidatePath;
  }

  // 2. Try adding extensions
  for (const ext of SUPPORTED_EXTENSIONS) {
    const withExt = candidatePath + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return withExt;
    }
  }

  // 3. Try directory index (e.g. ./routes -> ./routes/index.js)
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
    for (const ext of SUPPORTED_EXTENSIONS) {
      const indexPath = path.join(candidatePath, `index${ext}`);
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return indexPath;
      }
    }
  }

  return undefined;
}

function isAliased(specifier: string, aliases: Record<string, string[]>): boolean {
  for (const key of Object.keys(aliases)) {
    const prefix = key.replace(/\/\*$/, '');
    if (specifier === prefix || specifier.startsWith(prefix + '/')) {
      return true;
    }
  }
  return false;
}

function resolveAlias(
  specifier: string,
  repoRoot: string,
  aliases: Record<string, string[]>
): string | undefined {
  for (const [key, targets] of Object.entries(aliases)) {
    const cleanKey = key.replace(/\/\*$/, '');
    if (specifier === cleanKey || specifier.startsWith(cleanKey + '/')) {
      const subPath = specifier.slice(cleanKey.length).replace(/^\//, '');
      for (const target of targets) {
        const cleanTarget = target.replace(/\/\*$/, '');
        const candidate = path.resolve(repoRoot, cleanTarget, subPath);
        return candidate;
      }
    }
  }
  return undefined;
}

/**
 * Loads compilerOptions.paths from tsconfig.json or jsconfig.json if present.
 */
export function loadPathAliases(repoRoot: string): Record<string, string[]> {
  const tsconfigPath = path.join(repoRoot, 'tsconfig.json');
  const jsconfigPath = path.join(repoRoot, 'jsconfig.json');

  const configPath = fs.existsSync(tsconfigPath)
    ? tsconfigPath
    : fs.existsSync(jsconfigPath)
    ? jsconfigPath
    : null;

  if (!configPath) return {};

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    // Strip simple comments
    const cleaned = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    const parsed = JSON.parse(cleaned);
    return parsed.compilerOptions?.paths || {};
  } catch {
    return {};
  }
}
