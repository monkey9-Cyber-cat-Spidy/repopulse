import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { scanRepository } from '@repopulse/scanner';
import { buildC4Graph } from '../src/c4-builder.js';
import { analyzeGraph } from '../src/algorithms.js';
import { exportToReactFlow, exportToMermaid } from '../src/export.js';

describe('RepoPulse C4 Graph Engine', () => {
  it('builds C4 Level 1 Context diagram from scan results', () => {
    const scan = scanRepository(path.resolve(__dirname, '..'));
    const graph = buildC4Graph(scan, 1);

    expect(graph.order).toBeGreaterThanOrEqual(2);
    expect(graph.hasNode('system_main')).toBe(true);
    expect(graph.hasNode('user_client')).toBe(true);
  });

  it('builds C4 Level 2 Container diagram from scan results', () => {
    const scan = scanRepository(path.resolve(__dirname, '..'));
    const graph = buildC4Graph(scan, 2);

    expect(graph.hasNode('c_web_api')).toBe(true);
    expect(graph.hasNode('c_frontend')).toBe(true);
    expect(graph.hasEdge('c_frontend', 'c_web_api')).toBe(true);
  });

  it('builds C4 Level 3 Component diagram with dependencies', () => {
    const scan = scanRepository(path.resolve(__dirname, '..'));
    const graph = buildC4Graph(scan, 3);

    expect(graph.order).toBeGreaterThan(0);
    const metrics = analyzeGraph(graph);
    expect(metrics.totalNodes).toBe(graph.order);
    expect(metrics.centrality).toBeDefined();
  });

  it('builds C4 Level 4 Code diagram with functions and classes', () => {
    const scan = scanRepository(path.resolve(__dirname, '..'));
    const graph = buildC4Graph(scan, 4);

    expect(graph.order).toBeGreaterThan(0);
  });

  it('serializes graph to React Flow with Dagre layout coordinates', () => {
    const scan = scanRepository(path.resolve(__dirname, '..'));
    const graph = buildC4Graph(scan, 3);
    const reactFlow = exportToReactFlow(graph, 3);

    expect(reactFlow.c4Level).toBe(3);
    expect(reactFlow.nodes.length).toBe(graph.order);
    for (const node of reactFlow.nodes) {
      expect(node.position.x).toBeTypeOf('number');
      expect(node.position.y).toBeTypeOf('number');
      expect(node.data.label).toBeDefined();
    }
  });

  it('exports graph to valid Mermaid syntax', () => {
    const scan = scanRepository(path.resolve(__dirname, '..'));
    const graph = buildC4Graph(scan, 1);
    const mermaid = exportToMermaid(graph);

    expect(mermaid).toContain('flowchart TD');
    expect(mermaid).toContain('system_main');
  });
});
