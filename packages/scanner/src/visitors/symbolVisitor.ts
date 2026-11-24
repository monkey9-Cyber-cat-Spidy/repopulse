import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { DiscoveredSymbol, DiscoveredDependency, EvidencePointer } from '../types.js';
import { extractSafeSnippet } from '../redactor.js';

export function extractSymbolsAndDeps(
  ast: t.File,
  sourceLines: string[],
  filePath: string,
  traverseFn: (node: t.Node, visitors: any) => void
): { symbols: DiscoveredSymbol[]; dependencies: DiscoveredDependency[] } {
  const symbols: DiscoveredSymbol[] = [];
  const dependencies: DiscoveredDependency[] = [];

  traverseFn(ast, {
    // 1. Function Declarations: function hello() {}
    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      const name = path.node.id?.name;
      if (!name) return;

      const loc = path.node.loc;
      const startLine = loc ? loc.start.line : 1;
      const endLine = loc ? loc.end.line : startLine;

      const isExported =
        t.isExportNamedDeclaration(path.parent) || t.isExportDefaultDeclaration(path.parent);

      symbols.push({
        id: `FN_${name}_${filePath}_${startLine}`,
        name,
        kind: 'FUNCTION',
        isExported,
        isDefaultExport: t.isExportDefaultDeclaration(path.parent),
        evidence: {
          filePath,
          startLine,
          endLine,
          startColumn: loc ? loc.start.column : 0,
          endColumn: loc ? loc.end.column : 0,
          astNodeType: 'FunctionDeclaration',
          codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
          confidence: 1.0
        }
      });
    },

    // 2. Class Declarations: class OrderService {}
    ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
      const name = path.node.id?.name;
      if (!name) return;

      const loc = path.node.loc;
      const startLine = loc ? loc.start.line : 1;
      const endLine = loc ? loc.end.line : startLine;

      const isExported =
        t.isExportNamedDeclaration(path.parent) || t.isExportDefaultDeclaration(path.parent);

      symbols.push({
        id: `CLASS_${name}_${filePath}_${startLine}`,
        name,
        kind: 'CLASS',
        isExported,
        isDefaultExport: t.isExportDefaultDeclaration(path.parent),
        evidence: {
          filePath,
          startLine,
          endLine,
          startColumn: loc ? loc.start.column : 0,
          endColumn: loc ? loc.end.column : 0,
          astNodeType: 'ClassDeclaration',
          codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
          confidence: 1.0
        }
      });
    },

    // 3. Variable Declarations: const auth = () => {}
    VariableDeclaration(path: NodePath<t.VariableDeclaration>) {
      const isExported = t.isExportNamedDeclaration(path.parent);

      for (const decl of path.node.declarations) {
        if (t.isIdentifier(decl.id)) {
          const name = decl.id.name;
          const loc = decl.loc || path.node.loc;
          const startLine = loc ? loc.start.line : 1;
          const endLine = loc ? loc.end.line : startLine;

          const isFunction =
            t.isArrowFunctionExpression(decl.init) || t.isFunctionExpression(decl.init);

          symbols.push({
            id: `VAR_${name}_${filePath}_${startLine}`,
            name,
            kind: isFunction ? 'FUNCTION' : 'VARIABLE',
            isExported,
            isDefaultExport: false,
            evidence: {
              filePath,
              startLine,
              endLine,
              startColumn: loc ? loc.start.column : 0,
              endColumn: loc ? loc.end.column : 0,
              astNodeType: 'VariableDeclaration',
              codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
              confidence: 1.0
            }
          });
        }
      }
    },

    // 4. CommonJS Exports: module.exports = { ... } or exports.foo = ...
    AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
      const left = path.node.left;
      if (t.isMemberExpression(left)) {
        let exportedName: string | null = null;
        let isDefault = false;

        if (t.isIdentifier(left.object) && left.object.name === 'module') {
          if (t.isIdentifier(left.property) && left.property.name === 'exports') {
            isDefault = true;
            exportedName = 'default';
          }
        } else if (t.isIdentifier(left.object) && left.object.name === 'exports') {
          if (t.isIdentifier(left.property)) {
            exportedName = left.property.name;
          }
        }

        if (exportedName) {
          const loc = path.node.loc;
          const startLine = loc ? loc.start.line : 1;
          const endLine = loc ? loc.end.line : startLine;

          symbols.push({
            id: `EXPORT_${exportedName}_${filePath}_${startLine}`,
            name: exportedName,
            kind: 'VARIABLE',
            isExported: true,
            isDefaultExport: isDefault,
            evidence: {
              filePath,
              startLine,
              endLine,
              startColumn: loc ? loc.start.column : 0,
              endColumn: loc ? loc.end.column : 0,
              astNodeType: 'AssignmentExpression.exports',
              codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
              confidence: 1.0
            }
          });
        }
      }
    },

    // 5. Static ESM Imports: import { x } from './y'
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      const specifier = path.node.source.value;
      const importedNames: string[] = [];

      for (const spec of path.node.specifiers) {
        if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
          importedNames.push(spec.imported.name);
        } else if (t.isImportDefaultSpecifier(spec)) {
          importedNames.push('default');
        } else if (t.isImportNamespaceSpecifier(spec)) {
          importedNames.push('*');
        }
      }

      const loc = path.node.loc;
      const startLine = loc ? loc.start.line : 1;
      const endLine = loc ? loc.end.line : startLine;

      dependencies.push({
        sourceFilePath: filePath,
        rawSpecifier: specifier,
        importStatement: sourceLines.slice(Math.max(0, startLine - 1), endLine).join('\n'),
        importedNames,
        isDynamic: false,
        isExternal: !specifier.startsWith('.') && !specifier.startsWith('/'),
        evidence: {
          filePath,
          startLine,
          endLine,
          startColumn: loc ? loc.start.column : 0,
          endColumn: loc ? loc.end.column : 0,
          astNodeType: 'ImportDeclaration',
          codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
          confidence: 1.0
        }
      });
    },

    // 6. CommonJS require: const x = require('./y')
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;
      if (t.isIdentifier(callee) && (callee.name === 'require' || callee.name === 'import')) {
        const firstArg = path.node.arguments[0];
        if (t.isStringLiteral(firstArg)) {
          const specifier = firstArg.value;
          const loc = path.node.loc;
          const startLine = loc ? loc.start.line : 1;
          const endLine = loc ? loc.end.line : startLine;

          dependencies.push({
            sourceFilePath: filePath,
            rawSpecifier: specifier,
            importStatement: `require('${specifier}')`,
            importedNames: ['*'],
            isDynamic: callee.name === 'import',
            isExternal: !specifier.startsWith('.') && !specifier.startsWith('/'),
            evidence: {
              filePath,
              startLine,
              endLine,
              startColumn: loc ? loc.start.column : 0,
              endColumn: loc ? loc.end.column : 0,
              astNodeType: `CallExpression.${callee.name}`,
              codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
              confidence: 1.0
            }
          });
        }
      }
    }
  });

  return { symbols, dependencies };
}
