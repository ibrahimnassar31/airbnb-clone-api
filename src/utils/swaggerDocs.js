// This file sets up Swagger docs using ESM-only syntax. Only import and use in non-test environments.
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import YAML from 'yaml';

export function setupSwaggerDocs(app) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const spec = YAML.parse(readFileSync(path.join(__dirname, '../docs/openapi.yaml'), 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
}
