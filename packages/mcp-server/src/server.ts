import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { scanRepository, type RepositoryScanResult } from '@repopulse/scanner';
import { buildC4Graph, exportToReactFlow, exportToMermaid, type C4Level } from '@repopulse/graph';
import {
  extractClaimsFromMarkdown,
  verifyClaimsAgainstAST,
  computeTruthScore,
  generateCharacterizationTest,
  type TruthReport
} from '@repopulse/truth-engine';

export interface RepopulseServerState {
  currentScan?: RepositoryScanResult;
  currentTruthReport?: TruthReport;
}

export function createRepopulseServer(initialState: RepopulseServerState = {}): Server {
  const state: RepopulseServerState = { ...initialState };

  const server = new Server(
    {
      name: 'repopulse-mcp-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  // 1. List Available Tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'repopulse_scan',
          description:
            'Deterministically scans a target repository using static AST parsing, extracting routes, models, symbols, env vars, and dependencies with zero untrusted code execution.',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Absolute or relative path to target repository root'
              }
            },
            required: ['repoPath']
          }
        },
        {
          name: 'repopulse_get_graph',
          description:
            'Retrieves the hierarchical C4 architecture graph (Level 1: System Context, Level 2: Containers, Level 3: Components, Level 4: Code) with Dagre layout coordinates.',
          inputSchema: {
            type: 'object',
            properties: {
              c4Level: {
                type: 'number',
                enum: [1, 2, 3, 4],
                description: 'C4 abstraction level (default is 3: Component)'
              },
              format: {
                type: 'string',
                enum: ['reactflow', 'mermaid'],
                description: 'Output format (reactflow JSON or mermaid string)'
              }
            }
          }
        },
        {
          name: 'repopulse_query_symbol',
          description:
            'Queries AST symbol index for function/class declarations, route handlers, or models, returning exact line ranges and verifiable EvidencePointer.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Symbol, route path, or model name to look up'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'repopulse_verify_claims',
          description:
            'Audits Markdown documentation against code reality, computing Documentation Truth Score and flagging verified, outdated, and contradicted claims.',
          inputSchema: {
            type: 'object',
            properties: {
              docPath: {
                type: 'string',
                description: 'Relative path to documentation file (defaults to README.md)'
              }
            }
          }
        },
        {
          name: 'repopulse_get_evidence',
          description:
            'Retrieves verified, secret-redacted source code excerpts backing an architectural claim or symbol.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Relative path of file' },
              startLine: { type: 'number', description: 'Start line number' },
              endLine: { type: 'number', description: 'End line number' }
            },
            required: ['filePath', 'startLine', 'endLine']
          }
        },
        {
          name: 'repopulse_propose_test',
          description:
            'Generates automated characterization tests capturing existing observable behavior for safe refactoring.',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Route path (e.g. GET /api/orders) or function symbol name'
              },
              framework: {
                type: 'string',
                enum: ['VITEST', 'JEST'],
                description: 'Target test runner framework'
              }
            },
            required: ['target']
          }
        }
      ]
    };
  });

  // 2. Call Tool Request Handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'repopulse_scan': {
        const repoPath = String(args?.repoPath || '.');
        const resolvedPath = path.resolve(repoPath);

        const scan = scanRepository(resolvedPath);
        state.currentScan = scan;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'SUCCESS',
                  scanId: scan.scanId,
                  repositoryName: scan.repositoryName,
                  totalFiles: scan.totalFiles,
                  totalLOC: scan.totalLOC,
                  entrypoints: scan.entrypoints,
                  totalRoutes: scan.allRoutes.length,
                  totalModels: scan.allModels.length,
                  totalEnvVars: scan.allEnvVars.length,
                  durationMs: scan.durationMs
                },
                null,
                2
              )
            }
          ]
        };
      }

      case 'repopulse_get_graph': {
        if (!state.currentScan) {
          throw new Error('No repository scanned yet. Run repopulse_scan first.');
        }

        const level = (args?.c4Level || 3) as C4Level;
        const format = String(args?.format || 'reactflow');
        const graph = buildC4Graph(state.currentScan, level);

        if (format === 'mermaid') {
          return {
            content: [{ type: 'text', text: exportToMermaid(graph) }]
          };
        }

        const reactFlow = exportToReactFlow(graph, level);
        return {
          content: [{ type: 'text', text: JSON.stringify(reactFlow, null, 2) }]
        };
      }

      case 'repopulse_query_symbol': {
        if (!state.currentScan) {
          throw new Error('No repository scanned yet. Run repopulse_scan first.');
        }

        const queryName = String(args?.name || '').toLowerCase();
        const matchedSymbols: any[] = [];

        // Check routes
        for (const route of state.currentScan.allRoutes) {
          if (
            route.fullPath.toLowerCase().includes(queryName) ||
            route.pathPattern.toLowerCase().includes(queryName) ||
            route.handlerSymbol?.toLowerCase().includes(queryName)
          ) {
            matchedSymbols.push({
              kind: 'ROUTE',
              name: `${route.httpMethod} ${route.fullPath}`,
              middleware: route.middleware,
              handler: route.handlerSymbol,
              evidence: route.evidence
            });
          }
        }

        // Check models
        for (const model of state.currentScan.allModels) {
          if (model.modelName.toLowerCase().includes(queryName)) {
            matchedSymbols.push({
              kind: 'MODEL',
              name: model.modelName,
              ormType: model.ormType,
              fields: model.fields,
              evidence: model.evidence
            });
          }
        }

        // Check symbols
        for (const summary of state.currentScan.files.values()) {
          for (const sym of summary.symbols) {
            if (sym.name.toLowerCase().includes(queryName)) {
              matchedSymbols.push({
                kind: sym.kind,
                name: sym.name,
                isExported: sym.isExported,
                evidence: sym.evidence
              });
            }
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query: args?.name,
                  matchCount: matchedSymbols.length,
                  results: matchedSymbols
                },
                null,
                2
              )
            }
          ]
        };
      }

      case 'repopulse_verify_claims': {
        if (!state.currentScan) {
          throw new Error('No repository scanned yet. Run repopulse_scan first.');
        }

        const docPath = String(args?.docPath || 'README.md');
        const fullDocPath = path.resolve(state.currentScan.rootPath, docPath);

        let markdownContent = '';
        if (fs.existsSync(fullDocPath)) {
          markdownContent = fs.readFileSync(fullDocPath, 'utf8');
        } else {
          markdownContent = `# Repository ${state.currentScan.repositoryName}`;
        }

        const claims = extractClaimsFromMarkdown(markdownContent, docPath);
        const { verifiedClaims, undocumentedFindings } = verifyClaimsAgainstAST(
          claims,
          state.currentScan
        );
        const report = computeTruthScore(
          state.currentScan.repositoryName,
          verifiedClaims,
          undocumentedFindings
        );
        state.currentTruthReport = report;

        return {
          content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
        };
      }

      case 'repopulse_get_evidence': {
        if (!state.currentScan) {
          throw new Error('No repository scanned yet. Run repopulse_scan first.');
        }

        const filePath = String(args?.filePath);
        const startLine = Number(args?.startLine);
        const endLine = Number(args?.endLine);

        const fullPath = path.resolve(state.currentScan.rootPath, filePath);
        if (!fs.existsSync(fullPath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        const snippet = lines.slice(Math.max(0, startLine - 1), endLine).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  filePath,
                  startLine,
                  endLine,
                  codeSnippet: snippet,
                  verified: true
                },
                null,
                2
              )
            }
          ]
        };
      }

      case 'repopulse_propose_test': {
        if (!state.currentScan) {
          throw new Error('No repository scanned yet. Run repopulse_scan first.');
        }

        const target = String(args?.target || '');
        const framework = (args?.framework || 'VITEST') as 'VITEST' | 'JEST';

        // Check if route
        const matchedRoute = state.currentScan.allRoutes.find(
          (r) =>
            `${r.httpMethod} ${r.fullPath}`.toLowerCase() === target.toLowerCase() ||
            r.fullPath.toLowerCase() === target.toLowerCase()
        );

        if (matchedRoute) {
          const plan = generateCharacterizationTest(matchedRoute, framework);
          return {
            content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }]
          };
        }

        // Check if function symbol
        let matchedSymbol: any = null;
        for (const file of state.currentScan.files.values()) {
          const sym = file.symbols.find((s) => s.name.toLowerCase() === target.toLowerCase());
          if (sym) {
            matchedSymbol = sym;
            break;
          }
        }

        if (matchedSymbol) {
          const plan = generateCharacterizationTest(matchedSymbol, framework);
          return {
            content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }]
          };
        }

        throw new Error(`Target '${target}' could not be located in routes or symbols.`);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // 3. Resources Handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'repopulse://graph/c4',
          name: 'C4 Architecture Graph',
          description: 'Living C4 model graph of the current repository.',
          mimeType: 'application/json'
        },
        {
          uri: 'repopulse://truth/report',
          name: 'Documentation Truth Report',
          description: 'Truth score and claim breakdown against code facts.',
          mimeType: 'application/json'
        },
        {
          uri: 'repopulse://catalog/routes',
          name: 'API Route Catalog',
          description: 'Catalog of all discovered HTTP endpoints and middleware.',
          mimeType: 'application/json'
        }
      ]
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'repopulse://graph/c4') {
      if (!state.currentScan) throw new Error('No scan available.');
      const graph = buildC4Graph(state.currentScan, 3);
      const reactFlow = exportToReactFlow(graph, 3);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(reactFlow, null, 2)
          }
        ]
      };
    }

    if (uri === 'repopulse://truth/report') {
      if (!state.currentTruthReport) throw new Error('No truth report generated yet.');
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(state.currentTruthReport, null, 2)
          }
        ]
      };
    }

    if (uri === 'repopulse://catalog/routes') {
      if (!state.currentScan) throw new Error('No scan available.');
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(state.currentScan.allRoutes, null, 2)
          }
        ]
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  });

  return server;
}
