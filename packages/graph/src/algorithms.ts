import type Graph from 'graphology';
import type { C4NodeData, C4EdgeData } from './types.js';

export interface GraphMetricsResult {
  totalNodes: number;
  totalEdges: number;
  cycles: string[][];
  centrality: Array<{ id: string; label: string; score: number }>;
}

/**
 * Calculates graph metrics including cycle detection and degree centrality.
 */
export function analyzeGraph(graph: Graph<C4NodeData, C4EdgeData>): GraphMetricsResult {
  const totalNodes = graph.order;
  const totalEdges = graph.size;

  const cycles = detectCycles(graph);
  const centrality = computeCentrality(graph);

  return {
    totalNodes,
    totalEdges,
    cycles,
    centrality
  };
}

/**
 * Tarjan-based / DFS cycle detection for directed graphs.
 */
export function detectCycles(graph: Graph<C4NodeData, C4EdgeData>): string[][] {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];
  const currentPath: string[] = [];

  function dfs(node: string) {
    visited.add(node);
    recStack.add(node);
    currentPath.push(node);

    const neighbors = graph.outNeighbors(node);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Cycle detected
        const cycleStartIndex = currentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          cycles.push(currentPath.slice(cycleStartIndex));
        }
      }
    }

    recStack.delete(node);
    currentPath.pop();
  }

  for (const node of graph.nodes()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Computes degree centrality (in-degree + out-degree) to find the most foundational modules.
 */
export function computeCentrality(
  graph: Graph<C4NodeData, C4EdgeData>
): Array<{ id: string; label: string; score: number }> {
  const scores: Array<{ id: string; label: string; score: number }> = [];

  for (const node of graph.nodes()) {
    const inDeg = graph.inDegree(node);
    const outDeg = graph.outDegree(node);
    const score = inDeg * 2 + outDeg; // In-degree weighted higher (depended upon)
    const attrs = graph.getNodeAttributes(node);

    scores.push({
      id: node,
      label: attrs.label || node,
      score
    });
  }

  return scores.sort((a, b) => b.score - a.score);
}
