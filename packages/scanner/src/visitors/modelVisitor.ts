import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { DiscoveredModel, DiscoveredModelField, EvidencePointer } from '../types.js';
import { extractSafeSnippet } from '../redactor.js';

export function extractModelsFromAST(
  ast: t.File,
  sourceLines: string[],
  filePath: string,
  traverseFn: (node: t.Node, visitors: any) => void
): DiscoveredModel[] {
  const models: DiscoveredModel[] = [];

  traverseFn(ast, {
    // 1. Mongoose model: mongoose.model('User', UserSchema) or model('User', schema)
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;
      let isMongooseModel = false;

      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property) && callee.property.name === 'model') {
        isMongooseModel = true;
      } else if (t.isIdentifier(callee) && callee.name === 'model') {
        isMongooseModel = true;
      }

      if (isMongooseModel && path.node.arguments.length >= 1) {
        const firstArg = path.node.arguments[0];
        if (t.isStringLiteral(firstArg)) {
          const modelName = firstArg.value;
          const loc = path.node.loc;
          const startLine = loc ? loc.start.line : 1;
          const endLine = loc ? loc.end.line : startLine;

          models.push({
            id: `MONGOOSE_${modelName}_${filePath}`,
            ormType: 'MONGOOSE',
            modelName,
            fields: [], // populated if schema is defined inline
            relations: [],
            evidence: {
              filePath,
              startLine,
              endLine,
              startColumn: loc ? loc.start.column : 0,
              endColumn: loc ? loc.end.column : 0,
              astNodeType: 'CallExpression.mongoose.model',
              codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
              confidence: 1.0
            }
          });
        }
      }

      // 2. Sequelize: sequelize.define('User', { name: DataTypes.STRING })
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.property) &&
        callee.property.name === 'define' &&
        path.node.arguments.length >= 2
      ) {
        const firstArg = path.node.arguments[0];
        const secondArg = path.node.arguments[1];

        if (t.isStringLiteral(firstArg)) {
          const modelName = firstArg.value;
          const fields: DiscoveredModelField[] = [];

          if (t.isObjectExpression(secondArg)) {
            for (const prop of secondArg.properties) {
              if (t.isObjectProperty(prop)) {
                const keyName = t.isIdentifier(prop.key)
                  ? prop.key.name
                  : t.isStringLiteral(prop.key)
                  ? prop.key.value
                  : 'field';
                fields.push({
                  name: keyName,
                  type: 'UNKNOWN'
                });
              }
            }
          }

          const loc = path.node.loc;
          const startLine = loc ? loc.start.line : 1;
          const endLine = loc ? loc.end.line : startLine;

          models.push({
            id: `SEQUELIZE_${modelName}_${filePath}`,
            ormType: 'SEQUELIZE',
            modelName,
            fields,
            relations: [],
            evidence: {
              filePath,
              startLine,
              endLine,
              startColumn: loc ? loc.start.column : 0,
              endColumn: loc ? loc.end.column : 0,
              astNodeType: 'CallExpression.sequelize.define',
              codeSnippet: extractSafeSnippet(sourceLines, startLine, endLine),
              confidence: 1.0
            }
          });
        }
      }
    },

    // 3. Mongoose Schema definition: new Schema({ ... })
    NewExpression(path: NodePath<t.NewExpression>) {
      const callee = path.node.callee;
      let isSchema = false;

      if (t.isIdentifier(callee) && (callee.name === 'Schema' || callee.name === 'MongooseSchema')) {
        isSchema = true;
      } else if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.property) &&
        callee.property.name === 'Schema'
      ) {
        isSchema = true;
      }

      if (isSchema && path.node.arguments.length >= 1) {
        const firstArg = path.node.arguments[0];
        if (t.isObjectExpression(firstArg)) {
          const fields: DiscoveredModelField[] = [];
          for (const prop of firstArg.properties) {
            if (t.isObjectProperty(prop)) {
              const fieldName = t.isIdentifier(prop.key)
                ? prop.key.name
                : t.isStringLiteral(prop.key)
                ? prop.key.value
                : 'field';
              fields.push({
                name: fieldName,
                type: 'SchemaField'
              });
            }
          }

          // If there's an existing model in this file with empty fields, attach these
          if (models.length > 0 && models[models.length - 1].fields.length === 0) {
            models[models.length - 1].fields = fields;
          }
        }
      }
    }
  });

  return models;
}

/**
 * Special parser for Prisma schema files (schema.prisma).
 */
export function extractPrismaModels(
  prismaContent: string,
  filePath: string
): DiscoveredModel[] {
  const models: DiscoveredModel[] = [];
  const lines = prismaContent.split(/\r?\n/);

  let currentModel: DiscoveredModel | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // model User {
    const modelMatch = line.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
    if (modelMatch) {
      currentModel = {
        id: `PRISMA_${modelMatch[1]}_${filePath}`,
        ormType: 'PRISMA',
        modelName: modelMatch[1],
        fields: [],
        relations: [],
        evidence: {
          filePath,
          startLine: lineNum,
          endLine: lineNum,
          startColumn: 0,
          endColumn: line.length,
          astNodeType: 'PrismaModelDeclaration',
          codeSnippet: line,
          confidence: 1.0
        }
      };
      continue;
    }

    if (currentModel) {
      if (line === '}') {
        currentModel.evidence.endLine = lineNum;
        models.push(currentModel);
        currentModel = null;
        continue;
      }

      // Parse field: id Int @id @default(autoincrement())
      const fieldMatch = line.match(/^([A-Za-z0-9_]+)\s+([A-Za-z0-9_?\[\]]+)(.*)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        const attributes = fieldMatch[3] || '';

        const isId = attributes.includes('@id');
        const isUnique = attributes.includes('@unique');

        currentModel.fields.push({
          name: fieldName,
          type: fieldType,
          isId,
          isUnique,
          required: !fieldType.endsWith('?')
        });
      }
    }
  }

  return models;
}
