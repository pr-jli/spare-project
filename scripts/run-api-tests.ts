// Wrapper for `test:api` — runs bun tests, builds HTML report from junit, exits with the test exit code.
import { spawn } from 'node:child_process';
import path from 'node:path';

await import('./prepare-reports.ts');

const exitCode = await new Promise<number>((resolve) => {
  const child = spawn(
    'bun',
    ['test', 'tests/api', '--reporter=junit', '--reporter-outfile=reports/api/junit.xml'],
    { stdio: 'inherit', cwd: path.resolve('.') },
  );
  child.on('close', (code) => resolve(code ?? 1));
});

try {
  await import('./generate-api-report.ts');
} catch (error) {
  console.error('Failed to generate API HTML report:', error);
}

process.exit(exitCode);
