import express from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanRepository } from '@repopulse/scanner';
import { buildC4Graph, exportToReactFlow } from '@repopulse/graph';
import {
  extractClaimsFromMarkdown,
  verifyClaimsAgainstAST,
  computeTruthScore
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

app.listen(PORT, () => {
  console.log(`\n🚀 [RepoPulse Web Visualizer] Running at http://localhost:${PORT}`);
  console.log(`   Inspecting Target Repository: ${TARGET_REPO}\n`);
});
