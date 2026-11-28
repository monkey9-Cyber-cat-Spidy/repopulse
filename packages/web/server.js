import express from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanRepository } from '@repopulse/scanner';
import { buildC4Graph, exportToReactFlow } from '@repopulse/graph';
import {
  extractClaimsFromMarkdown,
  verifyClaimsAgainstAST,
  computeTruthScore,
  generateCharacterizationTest
} from '@repopulse/truth-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3005;
const TARGET_REPO = process.env.REPO_PATH || path.resolve(__dirname, '../../');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let cachedScan = null;
let cachedTruth = null;

function getOrComputeScan() {
  if (!cachedScan) {
    cachedScan = scanRepository(TARGET_REPO);
    const docPath = path.join(TARGET_REPO, 'README.md');
    const docContent = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf8') : '';
    const claims = extractClaimsFromMarkdown(docContent, 'README.md');
    const { verifiedClaims, undocumentedFindings } = verifyClaimsAgainstAST(claims, cachedScan);
    cachedTruth = computeTruthScore(cachedScan.repositoryName, verifiedClaims, undocumentedFindings);
  }
  return { scan: cachedScan, truth: cachedTruth };
}

app.get('/api/scan', (req, res) => {
  const { scan } = getOrComputeScan();
  res.json({
    scanId: scan.scanId,
    repositoryName: scan.repositoryName,
    totalFiles: scan.totalFiles,
    totalLOC: scan.totalLOC,
    entrypoints: scan.entrypoints,
    routesCount: scan.allRoutes.length,
    modelsCount: scan.allModels.length,
    durationMs: scan.durationMs
  });
});

app.get('/api/graph', (req, res) => {
  const level = Number.parseInt(String(req.query.level || '3'), 10);
  const { scan } = getOrComputeScan();
  const graph = buildC4Graph(scan, level);
  const reactFlow = exportToReactFlow(graph, level);
  res.json(reactFlow);
});

app.get('/api/truth', (req, res) => {
  const { truth } = getOrComputeScan();
  res.json(truth);
});

app.get('/api/routes', (req, res) => {
  const { scan } = getOrComputeScan();
  res.json(scan.allRoutes);
});

app.post('/api/test-gen', (req, res) => {
  const { target, filePath, kind, framework = 'VITEST' } = req.body || {};
  if (!target) return res.status(400).json({ error: 'target parameter required' });

  const { scan } = getOrComputeScan();
  const normalizedTarget = target.trim().toLowerCase();

  // 1. Direct Route match
  const route = scan.allRoutes.find(
    (r) =>
      `${r.httpMethod} ${r.fullPath}`.toLowerCase() === normalizedTarget ||
      r.fullPath.toLowerCase() === normalizedTarget
  );
  if (route) {
    return res.json(generateCharacterizationTest(route, framework));
  }

  // 2. Symbol match (prefer exact filePath if provided)
  if (filePath) {
    for (const file of scan.files.values()) {
      if (file.relativePath === filePath || file.filePath === filePath) {
        const sym = file.symbols.find((s) => s.name.toLowerCase() === normalizedTarget);
        if (sym) {
          return res.json(generateCharacterizationTest(sym, framework));
        }
      }
    }
  }
  for (const file of scan.files.values()) {
    const sym = file.symbols.find((s) => s.name.toLowerCase() === normalizedTarget);
    if (sym) {
      return res.json(generateCharacterizationTest(sym, framework));
    }
  }

  // 3. File / Component node match (e.g. routes/orders.js, lib/coupons.js, server.js)
  const fileSummary =
    scan.files.get(target) ||
    Array.from(scan.files.values()).find(
      (f) => f.relativePath.toLowerCase() === normalizedTarget || f.filePath.toLowerCase() === normalizedTarget
    );

  if (fileSummary) {
    const fileRoutes = fileSummary.routes.filter((r) => r.httpMethod !== 'USE');
    if (fileRoutes.length > 0) {
      const plans = fileRoutes.slice(0, 3).map((r) => generateCharacterizationTest(r, framework));
      return res.json({
        targetEntity: fileSummary.relativePath,
        framework,
        testCode: plans.map((p) => p.testCode).join('\n'),
        explanation: `Generated characterization suite for ${fileRoutes.length} route(s) in ${fileSummary.relativePath}.`
      });
    }

    const fileSyms = fileSummary.symbols.filter((s) => s.kind === 'FUNCTION' || s.kind === 'CLASS');
    if (fileSyms.length > 0) {
      const plans = fileSyms.slice(0, 3).map((s) => generateCharacterizationTest(s, framework));
      return res.json({
        targetEntity: fileSummary.relativePath,
        framework,
        testCode: plans.map((p) => p.testCode).join('\n'),
        explanation: `Generated characterization suite for ${fileSyms.length} symbol(s) in ${fileSummary.relativePath}.`
      });
    }
  }

  // 4. System / Container / Database node match (L1/L2)
  const topRoutes = scan.allRoutes.filter((r) => r.httpMethod !== 'USE').slice(0, 4);
  if (topRoutes.length > 0) {
    const entrypoint = scan.entrypoints[0] || 'server.js';
    const routeChecks = topRoutes
      .map(
        (r) => `  it('${r.httpMethod} ${r.fullPath} responds without 500 error', async () => {
    const res = await request(app).${r.httpMethod.toLowerCase()}('${r.fullPath.replace(/:[a-zA-Z0-9_]+/g, 'test-id')}');
    expect(res.status).toBeLessThan(500);
  });`
      )
      .join('\n\n');

    return res.json({
      targetEntity: target,
      framework,
      testCode: `import { describe, it, expect } from '${framework === 'VITEST' ? 'vitest' : '@jest/globals'}';
import request from 'supertest';
import app from '../${entrypoint}';

describe('System Smoke Characterization: ${target} (${scan.repositoryName})', () => {
${routeChecks}
});
`,
      explanation: `Generated system-level smoke characterization tests for ${target} covering ${topRoutes.length} core endpoints.`
    });
  }

  return res.status(404).json({ error: `Target '${target}' not found in symbols or routes` });
});

app.post('/api/rescan', (req, res) => {
  cachedScan = null;
  cachedTruth = null;
  const { scan, truth } = getOrComputeScan();
  res.json({ success: true, totalFiles: scan.totalFiles, truthScore: truth.truthScore });
});

app.listen(PORT, () => {
  console.log(`\n🚀 [RepoPulse Web Visualizer] Running at http://localhost:${PORT}`);
  console.log(`   Inspecting Target Repository: ${TARGET_REPO}\n`);
});
