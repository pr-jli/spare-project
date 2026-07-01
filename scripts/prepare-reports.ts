// Creates report folders before test runs so junit/html writers don't fail on missing paths.
import { mkdir } from 'node:fs/promises';

await mkdir('reports/api', { recursive: true });
await mkdir('reports/api/html', { recursive: true });
await mkdir('reports/e2e/html', { recursive: true });
await mkdir('reports/e2e/test-results', { recursive: true });
