import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { DiscoveredRoute, EvidencePointer } from '../types.js';
import { extractSafeSnippet } from '../redactor.js';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'use', 'all']);

export interface SubrouterMount {
  routerVarName: string;
  mountPath: string;
  evidence: EvidencePointer;
}

export function extractRoutesFromAST(
  ast: t.File,
  sourceLines: string[],
  filePath: string,
  traverseFn: (node: t.Node, visitors: any) => void
): { routes: DiscoveredRoute[]; mounts: SubrouterMount[] } {
  const routes: DiscoveredRoute[] = [];
  const mounts: SubrouterMount[] = [];

  traverseFn(ast, {
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;
      if (!t.isMemberExpression(callee)) return;

      const property = callee.property;
      const methodName = t.isIdentifier(property)
        ? property.name.toLowerCase()
        : t.isStringLiteral(property)
        ? property.value.toLowerCase()
        : null;

      if (!methodName || !HTTP_METHODS.has(methodName)) return;

      const args = path.node.arguments;
      if (args.length === 0) return;

      const firstArg = args[0];
      let pathPattern = '/';
      let handlerStartIndex = 1;

      if (t.isStringLiteral(firstArg)) {
        pathPattern = firstArg.value;
      } else if (t.isTemplateLiteral(firstArg)) {
        // Simple template literal approximation
        pathPattern = firstArg.quasis.map((q) => q.value.raw).join(':param');
      } else {
        // e.g. app.use(authMiddleware) where first arg is middleware
        pathPattern = '/';
        handlerStartIndex = 0;
      }

      // Check if this is a subrouter mount: app.use('/prefix', subRouter)
      if (methodName === 'use' && args.length >= 2) {
        const lastArg = args[args.length - 1];
        if (t.isIdentifier(lastArg)) {
          const loc = path.node.loc;
          const startLine = loc ? loc.start.line : 1;
          const endLine = loc ? loc.end.line : startLine;
          
          mounts.push({
            routerVarName: lastArg.name,
            mountPath: pathPattern,
            evidence: {
              filePath,
              startLine,
              endLine,
              startColumn: loc ? loc.start.column : 0,
              endColumn: loc ? loc.end.column : 0,
              astNodeType: 'CallExpression.use',
              codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
              confidence: 1.0
            }
          });
        }
      }

      // Extract middleware and handler names
      const middleware: string[] = [];
      let handlerSymbol: string | undefined = undefined;

      for (let i = handlerStartIndex; i < args.length; i++) {
        const arg = args[i];
        if (t.isIdentifier(arg)) {
          if (i === args.length - 1 && methodName !== 'use') {
            handlerSymbol = arg.name;
          } else {
            middleware.push(arg.name);
          }
        } else if (t.isMemberExpression(arg) && t.isIdentifier(arg.property)) {
          const name = `${t.isIdentifier(arg.object) ? arg.object.name + '.' : ''}${arg.property.name}`;
          if (i === args.length - 1 && methodName !== 'use') {
            handlerSymbol = name;
          } else {
            middleware.push(name);
          }
        } else if (t.isFunctionExpression(arg) || t.isArrowFunctionExpression(arg)) {
          const fnName = (t.isFunctionExpression(arg) && arg.id?.name) || `anonymous_handler_L${arg.loc?.start.line || 0}`;
          if (i === args.length - 1 && methodName !== 'use') {
            handlerSymbol = fnName;
          } else {
            middleware.push(fnName);
          }
        } else if (t.isArrayExpression(arg)) {
          // Middleware array: [auth, validate]
          for (const elem of arg.elements) {
            if (t.isIdentifier(elem)) {
              middleware.push(elem.name);
            }
          }
        }
      }

      const loc = path.node.loc;
      const startLine = loc ? loc.start.line : 1;
      const endLine = loc ? loc.end.line : startLine;

      routes.push({
        id: `${methodName.toUpperCase()}_${filePath}_${startLine}`,
        httpMethod: methodName.toUpperCase() as any,
        pathPattern,
        fullPath: pathPattern, // Will be prefixed if mounted under a subrouter
        handlerSymbol,
        middleware,
        evidence: {
          filePath,
          startLine,
          endLine,
          startColumn: loc ? loc.start.column : 0,
          endColumn: loc ? loc.end.column : 0,
          astNodeType: `CallExpression.${methodName}`,
          codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
          confidence: 1.0
        }
      });
    }
  });

  return { routes, mounts };
}
