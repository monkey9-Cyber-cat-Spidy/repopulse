import Graph from 'graphology';
import type { RepositoryScanResult } from '@repopulse/scanner';
import type { C4NodeData, C4EdgeData, C4Level } from './types.js';

export function buildC4Graph(
  scanResult: RepositoryScanResult,
  targetLevel: C4Level = 3
): Graph<C4NodeData, C4EdgeData> {
  const graph = new Graph<C4NodeData, C4EdgeData>({ multi: true, type: 'directed' });

  switch (targetLevel) {
    case 1:
      buildLevel1Context(graph, scanResult);
      break;
    case 2:
      buildLevel2Containers(graph, scanResult);
      break;
    case 3:
      buildLevel3Components(graph, scanResult);
      break;
    case 4:
      buildLevel4Code(graph, scanResult);
      break;
  }

  return graph;
}

/**
 * Level 1: System Context Diagram.
 * Shows repository system boundaries, users, databases, and external SaaS services.
 */
function buildLevel1Context(
  graph: Graph<C4NodeData, C4EdgeData>,
  scanResult: RepositoryScanResult
): void {
  // Main System Node
  graph.addNode('system_main', {
    id: 'system_main',
    label: scanResult.repositoryName,
    c4Level: 1,
    kind: 'SYSTEM',
    technologies: ['Node.js', 'Express', 'TypeScript'],
    loc: scanResult.totalLOC
  });

  // User Actor
  graph.addNode('user_client', {
    id: 'user_client',
    label: 'End User / Web Client',
    c4Level: 1,
    kind: 'SYSTEM',
    technologies: ['Browser', 'HTTP/REST']
  });

  graph.addEdge('user_client', 'system_main', {
    id: 'e_user_to_system',
    source: 'user_client',
    target: 'system_main',
    type: 'CALLS',
    label: 'Makes API / HTTPS Requests'
  });

  // Check for external services and databases in dependencies
  const externalDeps = new Set<string>();
  for (const dep of scanResult.allDependencies) {
    if (dep.isExternal) {
      externalDeps.add(dep.rawSpecifier);
    }
  }

  // Database detection
  let hasDb = false;
  if (
    scanResult.allModels.length > 0 ||
    externalDeps.has('mongoose') ||
    externalDeps.has('pg') ||
    externalDeps.has('@prisma/client') ||
    externalDeps.has('sequelize')
  ) {
    hasDb = true;
    graph.addNode('database_primary', {
      id: 'database_primary',
      label: 'Primary Database',
      c4Level: 1,
      kind: 'DATABASE',
      technologies: scanResult.allModels.map((m) => m.ormType).filter(Boolean)
    });

    graph.addEdge('system_main', 'database_primary', {
      id: 'e_system_to_db',
      source: 'system_main',
      target: 'database_primary',
      type: 'QUERIES_MODEL',
      label: 'Reads/Writes Data'
    });
  }

  // Common external integrations (Stripe, Twilio, Google, AWS, etc.)
  for (const dep of externalDeps) {
    if (dep.includes('stripe') || dep.includes('aws') || dep.includes('google') || dep.includes('twilio')) {
      const extId = `ext_${dep.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (!graph.hasNode(extId)) {
        graph.addNode(extId, {
          id: extId,
          label: `External Service (${dep})`,
          c4Level: 1,
          kind: 'EXTERNAL_SERVICE',
          technologies: [dep]
        });

        graph.addEdge('system_main', extId, {
          id: `e_main_to_${extId}`,
          source: 'system_main',
          target: extId,
          type: 'CALLS_EXTERNAL_API',
          label: `Uses API`
        });
      }
    }
  }
}

/**
 * Level 2: Container Diagram.
 * Shows web applications, API servers, worker queues, and persistence stores.
 */
function buildLevel2Containers(
  graph: Graph<C4NodeData, C4EdgeData>,
  scanResult: RepositoryScanResult
): void {
  // Web Container
  graph.addNode('c_web_api', {
    id: 'c_web_api',
    label: 'Express API Server',
    c4Level: 2,
    kind: 'CONTAINER',
    technologies: ['Node.js', 'Express'],
    loc: scanResult.totalLOC
  });

  // Client container if routes or public assets exist
  graph.addNode('c_frontend', {
    id: 'c_frontend',
    label: 'Web Client / SPA',
    c4Level: 2,
    kind: 'CONTAINER',
    technologies: ['HTML5', 'React', 'Browser']
  });

  graph.addEdge('c_frontend', 'c_web_api', {
    id: 'e_frontend_to_api',
    source: 'c_frontend',
    target: 'c_web_api',
    type: 'CALLS',
    label: 'JSON / REST'
  });

  if (scanResult.allModels.length > 0) {
    graph.addNode('c_database', {
      id: 'c_database',
      label: 'Relational / Document DB',
      c4Level: 2,
      kind: 'DATABASE',
      technologies: Array.from(new Set(scanResult.allModels.map((m) => m.ormType)))
    });

    graph.addEdge('c_web_api', 'c_database', {
      id: 'e_api_to_db',
      source: 'c_web_api',
      target: 'c_database',
      type: 'QUERIES_MODEL',
      label: 'Prisma / Mongoose ORM'
    });
  }
}

/**
 * Level 3: Component Diagram.
 * Shows routers, controllers, services, middleware, and ORM models.
 */
function buildLevel3Components(
  graph: Graph<C4NodeData, C4EdgeData>,
  scanResult: RepositoryScanResult
): void {
  // Add files as component nodes
  for (const [relPath, summary] of scanResult.files.entries()) {
    let kind: C4NodeData['kind'] = 'COMPONENT';
    if (summary.routes.length > 0) {
      kind = 'ROUTE';
    } else if (summary.models.length > 0) {
      kind = 'MODEL';
    }

    graph.addNode(relPath, {
      id: relPath,
      label: relPath,
      c4Level: 3,
      kind,
      filePath: summary.filePath,
      loc: summary.loc,
      technologies: [summary.language]
    });
  }

  // Add dependency edges between components
  let edgeCounter = 0;
  for (const dep of scanResult.allDependencies) {
    if (dep.resolvedFilePath && graph.hasNode(dep.sourceFilePath) && graph.hasNode(dep.resolvedFilePath)) {
      edgeCounter++;
      graph.addEdge(dep.sourceFilePath, dep.resolvedFilePath, {
        id: `e_comp_${edgeCounter}`,
        source: dep.sourceFilePath,
        target: dep.resolvedFilePath,
        type: 'IMPORTS',
        label: dep.importedNames.join(', ') || 'imports'
      });
    }
  }

  // Connect routes to models if in same or imported file
  for (const model of scanResult.allModels) {
    const modelNodeId = `model_${model.modelName}`;
    if (!graph.hasNode(modelNodeId)) {
      graph.addNode(modelNodeId, {
        id: modelNodeId,
        label: `Model: ${model.modelName}`,
        c4Level: 3,
        kind: 'MODEL',
        filePath: model.evidence.filePath,
        startLine: model.evidence.startLine,
        endLine: model.evidence.endLine,
        technologies: [model.ormType],
        evidence: model.evidence
      });

      if (graph.hasNode(model.evidence.filePath)) {
        graph.addEdge(model.evidence.filePath, modelNodeId, {
          id: `e_decl_${modelNodeId}`,
          source: model.evidence.filePath,
          target: modelNodeId,
          type: 'QUERIES_MODEL',
          label: 'declares'
        });
      }
    }
  }
}

/**
 * Level 4: Code Diagram.
 * Shows discrete functions, classes, and specific route endpoints with line numbers.
 */
function buildLevel4Code(
  graph: Graph<C4NodeData, C4EdgeData>,
  scanResult: RepositoryScanResult
): void {
  // Add Route Endpoints as specific code nodes
  for (const route of scanResult.allRoutes) {
    const routeId = `route_${route.httpMethod}_${route.fullPath}`;
    if (!graph.hasNode(routeId)) {
      graph.addNode(routeId, {
        id: routeId,
        label: `${route.httpMethod} ${route.fullPath}`,
        c4Level: 4,
        kind: 'ROUTE',
        filePath: route.evidence.filePath,
        startLine: route.evidence.startLine,
        endLine: route.evidence.endLine,
        technologies: ['Express'],
        evidence: route.evidence
      });
    }
  }

  // Add major functions and classes
  for (const summary of scanResult.files.values()) {
    for (const sym of summary.symbols) {
      if (sym.isExported || sym.kind === 'CLASS' || sym.kind === 'FUNCTION') {
        const symId = `sym_${sym.name}_${summary.relativePath}_${sym.evidence.startLine}`;
        if (!graph.hasNode(symId)) {
          graph.addNode(symId, {
            id: symId,
            label: `${sym.name}()`,
            c4Level: 4,
            kind: 'CODE',
            filePath: summary.relativePath,
            startLine: sym.evidence.startLine,
            endLine: sym.evidence.endLine,
            technologies: ['TypeScript/JS'],
            evidence: sym.evidence
          });
        }
      }
    }
  }
}
