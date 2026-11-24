import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { DiscoveredEnvVar, EvidencePointer } from '../types.js';
import { extractSafeSnippet } from '../redactor.js';

export function extractEnvVarsFromAST(
  ast: t.File,
  sourceLines: string[],
  filePath: string,
  traverseFn: (node: t.Node, visitors: any) => void
): DiscoveredEnvVar[] {
  const envMap = new Map<string, { locations: EvidencePointer[]; defaultVal?: string }>();

  traverseFn(ast, {
    MemberExpression(path: NodePath<t.MemberExpression>) {
      // Look for process.env.VAR_NAME or process.env['VAR_NAME']
      const obj = path.node.object;
      if (!t.isMemberExpression(obj)) return;
      if (!t.isIdentifier(obj.object) || obj.object.name !== 'process') return;
      if (!t.isIdentifier(obj.property) || obj.property.name !== 'env') return;

      let varName: string | null = null;
      const prop = path.node.property;

      if (t.isIdentifier(prop)) {
        varName = prop.name;
      } else if (t.isStringLiteral(prop)) {
        varName = prop.value;
      }

      if (!varName) return;

      const loc = path.node.loc;
      const startLine = loc ? loc.start.line : 1;
      const endLine = loc ? loc.end.line : startLine;

      // Check if there is a default fallback: process.env.PORT || 3000
      let defaultValue: string | undefined = undefined;
      const parent = path.parent;
      if (t.isLogicalExpression(parent) && (parent.operator === '||' || parent.operator === '??')) {
        if (parent.left === path.node) {
          if (t.isStringLiteral(parent.right)) {
            defaultValue = parent.right.value;
          } else if (t.isNumericLiteral(parent.right)) {
            defaultValue = String(parent.right.value);
          } else if (t.isBooleanLiteral(parent.right)) {
            defaultValue = String(parent.right.value);
          }
        }
      }

      const pointer: EvidencePointer = {
        filePath,
        startLine,
        endLine,
        startColumn: loc ? loc.start.column : 0,
        endColumn: loc ? loc.end.column : 0,
        astNodeType: 'MemberExpression.process.env',
        codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
        confidence: 1.0
      };

      const existing = envMap.get(varName);
      if (existing) {
        existing.locations.push(pointer);
        if (!existing.defaultVal && defaultValue) {
          existing.defaultVal = defaultValue;
        }
      } else {
        envMap.set(varName, {
          locations: [pointer],
          defaultVal: defaultValue
        });
      }
    }
  });

  const results: DiscoveredEnvVar[] = [];
  for (const [name, info] of envMap.entries()) {
    results.push({
      name,
      usageCount: info.locations.length,
      locations: info.locations,
      defaultValue: info.defaultVal
    });
  }

  return results;
}
