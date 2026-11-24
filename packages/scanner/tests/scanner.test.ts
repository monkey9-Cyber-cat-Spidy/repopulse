import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { redactSecrets } from '../src/redactor.js';
import { scanRepository } from '../src/parser.js';
import { extractRoutesFromAST } from '../src/visitors/routeVisitor.js';
import { extractModelsFromAST, extractPrismaModels } from '../src/visitors/modelVisitor.js';
import { extractEnvVarsFromAST } from '../src/visitors/envVisitor.js';
import { extractSymbolsAndDeps } from '../src/visitors/symbolVisitor.js';
import { parse } from '@babel/parser';
// @ts-ignore
import traverseDefault from '@babel/traverse';

const traverse = (traverseDefault as any).default || traverseDefault;

describe('RepoPulse Scanner & Redactor', () => {
  it('redacts sensitive API keys and secrets deterministically', () => {
    const mockAwsKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
    const mockStripeKey = ['sk', 'live', '1234567890abcdefghijklmn'].join('_');
    const raw = `const apiKey = "${mockAwsKey}"; const secret = "${mockStripeKey}";`;
    const result = redactSecrets(raw);

    expect(result.redactedCount).toBe(2);
    expect(result.sanitizedText).toContain('[REDACTED_SECRET: AWS_ACCESS_KEY]');
    expect(result.sanitizedText).toContain('[REDACTED_SECRET: STRIPE_SECRET_KEY]');
    expect(result.sanitizedText).not.toContain(mockAwsKey);
    expect(result.sanitizedText).not.toContain(mockStripeKey);
  });

  it('extracts Express routes, HTTP methods, and middleware chains from AST', () => {
    const code = `
      const express = require('express');
      const app = express();
      
      app.get('/api/orders/:id', authMiddleware, validateRequest, getOrder);
      app.post('/api/checkout', [rateLimit, verifyPayment], processCheckout);
    `;
    const lines = code.split('\n');
    const ast = parse(code, { sourceType: 'unambiguous' });

    const { routes } = extractRoutesFromAST(ast, lines, 'server.js', traverse);

    expect(routes).toHaveLength(2);
    expect(routes[0].httpMethod).toBe('GET');
    expect(routes[0].pathPattern).toBe('/api/orders/:id');
    expect(routes[0].middleware).toEqual(['authMiddleware', 'validateRequest']);
    expect(routes[0].handlerSymbol).toBe('getOrder');

    expect(routes[1].httpMethod).toBe('POST');
    expect(routes[1].pathPattern).toBe('/api/checkout');
    expect(routes[1].middleware).toEqual(['rateLimit', 'verifyPayment']);
    expect(routes[1].handlerSymbol).toBe('processCheckout');
  });

  it('extracts Mongoose schemas and models', () => {
    const code = `
      const mongoose = require('mongoose');
      const userSchema = new mongoose.Schema({
        name: String,
        email: { type: String, required: true }
      });
      const User = mongoose.model('User', userSchema);
    `;
    const lines = code.split('\n');
    const ast = parse(code, { sourceType: 'unambiguous' });

    const models = extractModelsFromAST(ast, lines, 'models/User.js', traverse);
    expect(models).toHaveLength(1);
    expect(models[0].ormType).toBe('MONGOOSE');
    expect(models[0].modelName).toBe('User');
  });

  it('extracts Prisma models, fields, IDs, and relations', () => {
    const prismaSchema = `
      model User {
        id        String   @id @default(uuid())
        email     String   @unique
        orders    Order[]
        createdAt DateTime @default(now())
      }

      model Order {
        id     String @id
        userId String
        user   User   @relation(fields: [userId], references: [id])
      }
    `;

    const models = extractPrismaModels(prismaSchema, 'prisma/schema.prisma');
    expect(models).toHaveLength(2);

    const userModel = models.find((m) => m.modelName === 'User');
    expect(userModel).toBeDefined();
    expect(userModel?.fields.find((f) => f.name === 'id')?.isId).toBe(true);
    expect(userModel?.fields.find((f) => f.name === 'email')?.isUnique).toBe(true);
  });

  it('extracts class declarations, exported functions, and dependencies', () => {
    const code = `
      const fs = require('fs');
      import { util } from './utils';

      export class OrderService {
        createOrder() {}
      }

      export function calculateTotal() { return 100; }
      module.exports = { OrderService };
    `;
    const lines = code.split('\n');
    const ast = parse(code, { sourceType: 'unambiguous' });

    const { symbols, dependencies } = extractSymbolsAndDeps(ast, lines, 'service.js', traverse);

    expect(symbols.some((s) => s.name === 'OrderService' && s.kind === 'CLASS')).toBe(true);
    expect(symbols.some((s) => s.name === 'calculateTotal' && s.kind === 'FUNCTION')).toBe(true);
    expect(dependencies.some((d) => d.rawSpecifier === 'fs')).toBe(true);
    expect(dependencies.some((d) => d.rawSpecifier === './utils')).toBe(true);
  });

  it('extracts process.env variables and default fallback values', () => {
    const code = `
      const port = process.env.PORT || 3000;
      const dbUrl = process.env['DATABASE_URL'];
      const secret = process.env.JWT_SECRET ?? 'fallback_secret';
    `;
    const lines = code.split('\n');
    const ast = parse(code, { sourceType: 'unambiguous' });

    const envVars = extractEnvVarsFromAST(ast, lines, 'config.js', traverse);

    expect(envVars).toHaveLength(3);
    const portVar = envVars.find((v) => v.name === 'PORT');
    expect(portVar).toBeDefined();
    expect(portVar?.defaultValue).toBe('3000');
  });

  it('scans a repository root and produces deterministic evidence pointers', () => {
    const result = scanRepository(path.resolve(__dirname, '..'));

    expect(result.totalFiles).toBeGreaterThan(0);
    expect(result.totalLOC).toBeGreaterThan(0);
    expect(result.files.size).toBeGreaterThan(0);

    for (const dep of result.allDependencies) {
      expect(dep.evidence.filePath).toBeDefined();
      expect(dep.evidence.startLine).toBeGreaterThan(0);
      expect(dep.evidence.confidence).toBe(1.0);
    }
  });
});
