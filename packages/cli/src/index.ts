#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { scanRepository } from '@repopulse/scanner';
import { buildC4Graph, exportToReactFlow, exportToMermaid } from '@repopulse/graph';
import {
  extractClaimsFromMarkdown,
  verifyClaimsAgainstAST,
  computeTruthScore,
  generateCharacterizationTest
} from '@repopulse/truth-engine';
import { runServer } from '@repopulse/mcp-server';

const program = new Command();

program
  .name('repopulse')
  .description('RepoPulse — Living Architecture Cartographer & Truth Engine')
  .version('1.0.0');

// Command: scan
program
  .command('scan [targetPath]')
  .description('Deterministically scans repository AST and constructs C4 architecture graph')
  .option('-o, --output <dir>', 'Output directory for artifacts', '.repopulse')
  .option('-l, --level <number>', 'C4 Level (1, 2, 3, or 4)', '3')
  .action((targetPath = '.', options) => {
    const root = path.resolve(targetPath);
    console.log(`\n🔍 [RepoPulse] Scanning repository: ${root}...\n`);

    const scan = scanRepository(root);
    console.log(`✅ Scan Complete in ${scan.durationMs}ms`);
    console.log(`   - Total Files: ${scan.totalFiles}`);
    console.log(`   - Total Lines of Code: ${scan.totalLOC}`);
    console.log(`   - Entrypoints Discovered: ${scan.entrypoints.join(', ') || 'None detected'}`);
    console.log(`   - API Routes Extracted: ${scan.allRoutes.length}`);
    console.log(`   - Data Models Extracted: ${scan.allModels.length}`);
    console.log(`   - Environment Variables Detected: ${scan.allEnvVars.length}`);

    // Build C4 Graph
    const c4Level = Number.parseInt(options.level, 10) as 1 | 2 | 3 | 4;
    const graph = buildC4Graph(scan, c4Level);
    const reactFlow = exportToReactFlow(graph, c4Level);

    // Save artifacts
    const outDir = path.resolve(root, options.output);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const scanOutPath = path.join(outDir, 'scan.json');
    const graphOutPath = path.join(outDir, `c4-level-${c4Level}.json`);
    const mermaidOutPath = path.join(outDir, `architecture.mmd`);

    fs.writeFileSync(scanOutPath, JSON.stringify(scan, null, 2), 'utf8');
    fs.writeFileSync(graphOutPath, JSON.stringify(reactFlow, null, 2), 'utf8');
    fs.writeFileSync(mermaidOutPath, exportToMermaid(graph), 'utf8');

    console.log(`\n📁 Artifacts persisted to ${outDir}:`);
    console.log(`   - ${scanOutPath}`);
    console.log(`   - ${graphOutPath}`);
    console.log(`   - ${mermaidOutPath}\n`);
  });

// Command: verify
program
  .command('verify [targetPath]')
  .description('Audits documentation (README.md) against actual code reality and outputs Truth Score')
  .option('-d, --doc <path>', 'Documentation file path', 'README.md')
  .action((targetPath = '.', options) => {
    const root = path.resolve(targetPath);
    const docFile = path.resolve(root, options.doc);

    console.log(`\n⚖️  [RepoPulse Truth Engine] Auditing documentation: ${docFile}...`);

    if (!fs.existsSync(docFile)) {
      console.error(`❌ Documentation file not found: ${docFile}`);
      process.exit(1);
    }

    const scan = scanRepository(root);
    const docContent = fs.readFileSync(docFile, 'utf8');
    const claims = extractClaimsFromMarkdown(docContent, options.doc);
    const { verifiedClaims, undocumentedFindings } = verifyClaimsAgainstAST(claims, scan);
    const report = computeTruthScore(scan.repositoryName, verifiedClaims, undocumentedFindings);

    console.log(`\n📊 Documentation Truth Score: ${report.truthScore}%\n`);
    console.log(`Breakdown:`);
    console.log(`   - Verified Claims:      ${report.breakdown.verified}`);
    console.log(`   - Outdated Claims:      ${report.breakdown.outdated}`);
    console.log(`   - Contradicted Claims:  ${report.breakdown.contradicted}`);
    console.log(`   - Undocumented Systems: ${report.breakdown.undocumented}\n`);

    if (report.breakdown.contradicted > 0) {
      console.log(`🚨 Contradictions Detected:`);
      for (const claim of report.claims.filter((c) => c.status === 'CONTRADICTED')) {
        console.log(`   - [Line ${claim.line}] "${claim.rawText}" -> ${claim.explanation}`);
      }
      console.log('');
    }

    if (report.breakdown.undocumented > 0) {
      console.log(`⚠️  Undocumented Systems Discovered in Code:`);
      for (const undoc of report.undocumentedFindings.slice(0, 5)) {
        console.log(`   - ${undoc.description} (${undoc.evidence?.filePath}:${undoc.evidence?.startLine})`);
      }
      console.log('');
    }
  });

// Command: mcp
program
  .command('mcp')
  .description('Starts the RepoPulse Model Context Protocol (MCP) server over stdio')
  .action(async () => {
    await runServer();
  });

// Command: test-gen
program
  .command('test-gen <target>')
  .description('Generates behavioral characterization tests for an endpoint or function')
  .option('-p, --path <path>', 'Repository root path', '.')
  .option('-f, --framework <framework>', 'VITEST or JEST', 'VITEST')
  .action((target, options) => {
    const root = path.resolve(options.path);
    const scan = scanRepository(root);

    // Find route or symbol
    const route = scan.allRoutes.find(
      (r) =>
        `${r.httpMethod} ${r.fullPath}`.toLowerCase() === target.toLowerCase() ||
        r.fullPath.toLowerCase() === target.toLowerCase()
    );

    if (route) {
      const plan = generateCharacterizationTest(route, options.framework as any);
      console.log(`\n🧪 Generated Characterization Test for ${target}:\n`);
      console.log(plan.testCode);
      return;
    }

    let symbol: any = null;
    for (const file of scan.files.values()) {
      const found = file.symbols.find((s) => s.name.toLowerCase() === target.toLowerCase());
      if (found) {
        symbol = found;
        break;
      }
    }

    if (symbol) {
      const plan = generateCharacterizationTest(symbol, options.framework as any);
      console.log(`\n🧪 Generated Characterization Test for ${target}:\n`);
      console.log(plan.testCode);
      return;
    }

    console.error(`❌ Target '${target}' not found in scanned routes or symbols.`);
  });

program.parse(process.argv);
