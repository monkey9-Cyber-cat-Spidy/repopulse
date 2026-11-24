import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { createRepopulseServer } from '../src/server.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

describe('RepoPulse MCP Server', () => {
  it('registers all standardized RepoPulse tools', async () => {
    const server = createRepopulseServer();
    const listToolsHandler = (server as any)._requestHandlers.get(
      ListToolsRequestSchema.shape.method.value
    );
    expect(listToolsHandler).toBeDefined();

    const response = await listToolsHandler({ method: 'tools/list' });
    const toolNames = response.tools.map((t: any) => t.name);

    expect(toolNames).toContain('repopulse_scan');
    expect(toolNames).toContain('repopulse_get_graph');
    expect(toolNames).toContain('repopulse_query_symbol');
    expect(toolNames).toContain('repopulse_verify_claims');
    expect(toolNames).toContain('repopulse_get_evidence');
    expect(toolNames).toContain('repopulse_propose_test');
  });

  it('registers standardized RepoPulse resources', async () => {
    const server = createRepopulseServer();
    const listResHandler = (server as any)._requestHandlers.get(
      ListResourcesRequestSchema.shape.method.value
    );
    expect(listResHandler).toBeDefined();

    const response = await listResHandler({ method: 'resources/list' });
    const uris = response.resources.map((r: any) => r.uri);

    expect(uris).toContain('repopulse://graph/c4');
    expect(uris).toContain('repopulse://truth/report');
    expect(uris).toContain('repopulse://catalog/routes');
  });

  it('executes full suite of tools: scan, get_graph, query_symbol, and verify_claims', async () => {
    const server = createRepopulseServer();
    const callToolHandler = (server as any)._requestHandlers.get(
      CallToolRequestSchema.shape.method.value
    );

    // 1. repopulse_scan
    const scanResult = await callToolHandler({
      method: 'tools/call',
      params: {
        name: 'repopulse_scan',
        arguments: {
          repoPath: path.resolve(__dirname, '..')
        }
      }
    });

    expect(scanResult.content).toBeDefined();
    const parsedScan = JSON.parse(scanResult.content[0].text);
    expect(parsedScan.status).toBe('SUCCESS');
    expect(parsedScan.totalFiles).toBeGreaterThan(0);

    // 2. repopulse_get_graph (reactflow & mermaid)
    const graphResult = await callToolHandler({
      method: 'tools/call',
      params: {
        name: 'repopulse_get_graph',
        arguments: { c4Level: 3, format: 'reactflow' }
      }
    });
    const parsedGraph = JSON.parse(graphResult.content[0].text);
    expect(parsedGraph.nodes.length).toBeGreaterThan(0);

    const mermaidResult = await callToolHandler({
      method: 'tools/call',
      params: {
        name: 'repopulse_get_graph',
        arguments: { c4Level: 1, format: 'mermaid' }
      }
    });
    expect(mermaidResult.content[0].text).toContain('flowchart TD');

    // 3. repopulse_query_symbol
    const queryResult = await callToolHandler({
      method: 'tools/call',
      params: {
        name: 'repopulse_query_symbol',
        arguments: { name: 'server' }
      }
    });
    const parsedQuery = JSON.parse(queryResult.content[0].text);
    expect(parsedQuery.matchCount).toBeGreaterThanOrEqual(0);

    // 4. repopulse_verify_claims
    const verifyResult = await callToolHandler({
      method: 'tools/call',
      params: {
        name: 'repopulse_verify_claims',
        arguments: { docPath: 'README.md' }
      }
    });
    const parsedTruth = JSON.parse(verifyResult.content[0].text);
    expect(parsedTruth.truthScore).toBeDefined();

    // 5. Read Resource repopulse://graph/c4
    const readResHandler = (server as any)._requestHandlers.get(
      ReadResourceRequestSchema.shape.method.value
    );
    const resourceResult = await readResHandler({
      method: 'resources/read',
      params: { uri: 'repopulse://graph/c4' }
    });
    expect(resourceResult.contents[0].text).toContain('c4Level');
  });
});
