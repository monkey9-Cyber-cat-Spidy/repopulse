import type Graph from 'graphology';
import dagre from '@dagrejs/dagre';
import type {
  C4NodeData,
  C4EdgeData,
  C4Level,
  ReactFlowGraph,
  ReactFlowNode,
  ReactFlowEdge
} from './types.js';
import { analyzeGraph } from './algorithms.js';

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  rankDir?: 'TB' | 'LR' | 'BT' | 'RL';
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Serializes a Graphology C4 graph to React Flow format with pre-computed Dagre coordinates.
 */
export function exportToReactFlow(
  graph: Graph<C4NodeData, C4EdgeData>,
  c4Level: C4Level,
  options: LayoutOptions = {}
): ReactFlowGraph {
  const nodeWidth = options.nodeWidth || 220;
  const nodeHeight = options.nodeHeight || 80;
  const rankDir = options.rankDir || 'TB';

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: rankDir,
    ranksep: options.rankSep || 60,
    nodesep: options.nodeSep || 40
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes()) {
    g.setNode(node, { width: nodeWidth, height: nodeHeight });
  }

  for (const edge of graph.edges()) {
    const source = graph.source(edge);
    const target = graph.target(edge);
    g.setEdge(source, target);
  }

  dagre.layout(g);

  const nodes: ReactFlowNode[] = [];
  for (const node of graph.nodes()) {
    const dagreNode = g.node(node);
    const attrs = graph.getNodeAttributes(node);

    nodes.push({
      id: node,
      type: 'c4Node',
      position: {
        x: dagreNode ? dagreNode.x - nodeWidth / 2 : 0,
        y: dagreNode ? dagreNode.y - nodeHeight / 2 : 0
      },
      data: {
        ...attrs,
        metrics: {
          inDegree: graph.inDegree(node),
          outDegree: graph.outDegree(node)
        }
      }
    });
  }

  const edges: ReactFlowEdge[] = [];
  for (const edge of graph.edges()) {
    const source = graph.source(edge);
    const target = graph.target(edge);
    const attrs = graph.getEdgeAttributes(edge);

    edges.push({
      id: edge,
      source,
      target,
      label: attrs.label,
      animated: attrs.type === 'CALLS' || attrs.type === 'CALLS_EXTERNAL_API',
      data: attrs
    });
  }

  const metrics = analyzeGraph(graph);

  return {
    c4Level,
    nodes,
    edges,
    metrics: {
      totalNodes: metrics.totalNodes,
      totalEdges: metrics.totalEdges,
      cyclesDetected: metrics.cycles.length,
      centralModules: metrics.centrality.slice(0, 5)
    }
  };
}

/**
 * Exports graph to Mermaid markdown format.
 */
export function exportToMermaid(graph: Graph<C4NodeData, C4EdgeData>): string {
  const lines: string[] = ['flowchart TD'];

  for (const node of graph.nodes()) {
    const attrs = graph.getNodeAttributes(node);
    const cleanId = node.replace(/[^a-zA-Z0-9_]/g, '_');
    const safeLabel = (attrs.label || node).replace(/["()]/g, '');
    lines.push(`    ${cleanId}["${safeLabel}"]`);
  }

  for (const edge of graph.edges()) {
    const source = graph.source(edge).replace(/[^a-zA-Z0-9_]/g, '_');
    const target = graph.target(edge).replace(/[^a-zA-Z0-9_]/g, '_');
    const attrs = graph.getEdgeAttributes(edge);
    if (attrs.label) {
      lines.push(`    ${source} -- "${attrs.label}" --> ${target}`);
    } else {
      lines.push(`    ${source} --> ${target}`);
    }
  }

  return lines.join('\n');
}
