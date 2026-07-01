// Bun only outputs junit XML. This turns reports/api/junit.xml into a readable HTML report.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const junitPath = path.resolve('reports/api/junit.xml');
const htmlPath = path.resolve('reports/api/html/index.html');

interface TestCase {
  name: string;
  suite: string;
  time: number;
  file: string;
  line: string;
  failed: boolean;
  failureMessage?: string;
}

function parseAttr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match?.[1] ?? '';
}

function parseJUnit(xml: string): {
  tests: number;
  failures: number;
  time: number;
  cases: TestCase[];
} {
  const cases: TestCase[] = [];
  let currentSuite = '';

  for (const testcaseMatch of xml.matchAll(/<testcase\b([^>]*)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const attrs = testcaseMatch[1];
    const body = testcaseMatch[2] ?? '';
    const classname = parseAttr(`<testcase ${attrs}`, 'classname');
    const file = parseAttr(`<testcase ${attrs}`, 'file');

    if (file.endsWith('.test.ts')) {
      currentSuite = classname;
    }

    cases.push({
      name: parseAttr(`<testcase ${attrs}`, 'name'),
      suite: classname || currentSuite,
      time: Number(parseAttr(`<testcase ${attrs}`, 'time') || 0),
      file: parseAttr(`<testcase ${attrs}`, 'file'),
      line: parseAttr(`<testcase ${attrs}`, 'line'),
      failed: body.includes('<failure'),
      failureMessage: body.match(/<failure[^>]*>([\s\S]*?)<\/failure>/)?.[1]?.trim(),
    });
  }

  const root = xml.match(/<testsuites\b([^>]*)>/);
  const rootAttrs = root ? `<testsuites ${root[1]}` : '';

  return {
    tests: Number(parseAttr(rootAttrs, 'tests') || cases.length),
    failures: Number(parseAttr(rootAttrs, 'failures') || cases.filter((c) => c.failed).length),
    time: Number(parseAttr(rootAttrs, 'time') || 0),
    cases,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderReport(summary: ReturnType<typeof parseJUnit>): string {
  const passed = summary.tests - summary.failures;
  const status = summary.failures === 0 ? 'passed' : 'failed';
  const generatedAt = new Date().toLocaleString();

  const rows = summary.cases
    .map((test) => {
      const statusClass = test.failed ? 'fail' : 'pass';
      const statusLabel = test.failed ? 'Failed' : 'Passed';
      const location = test.file ? `${test.file}${test.line ? `:${test.line}` : ''}` : '';
      const failure = test.failureMessage
        ? `<pre class="failure">${escapeHtml(test.failureMessage)}</pre>`
        : '';

      return `<tr class="${statusClass}">
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>${escapeHtml(test.suite)}</td>
        <td>${escapeHtml(test.name)}</td>
        <td>${test.time.toFixed(2)}s</td>
        <td><code>${escapeHtml(location)}</code>${failure}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Test Report</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; line-height: 1.5; }
    h1 { margin-bottom: 8px; }
    .meta { color: #666; margin-bottom: 24px; }
    .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; min-width: 120px; }
    .card strong { display: block; font-size: 24px; }
    .status.passed { color: #137333; }
    .status.failed { color: #c5221f; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge.pass { background: #e6f4ea; color: #137333; }
    .badge.fail { background: #fce8e6; color: #c5221f; }
    code { font-size: 12px; }
    pre.failure { margin-top: 8px; padding: 8px; background: #fce8e6; border-radius: 6px; white-space: pre-wrap; }
    tr.fail { background: rgba(197, 34, 31, 0.04); }
  </style>
</head>
<body>
  <h1>API Test Report</h1>
  <p class="meta">Generated ${escapeHtml(generatedAt)} · Bun test · Product Hunt GraphQL API</p>
  <p class="status ${status}"><strong>${status === 'passed' ? 'All tests passed' : `${summary.failures} failed`}</strong></p>
  <div class="summary">
    <div class="card"><strong>${summary.tests}</strong>Total</div>
    <div class="card"><strong>${passed}</strong>Passed</div>
    <div class="card"><strong>${summary.failures}</strong>Failed</div>
    <div class="card"><strong>${summary.time.toFixed(2)}s</strong>Duration</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>Suite</th>
        <th>Test</th>
        <th>Time</th>
        <th>Location</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

const xml = await readFile(junitPath, 'utf8');
const summary = parseJUnit(xml);
await mkdir(path.dirname(htmlPath), { recursive: true });
await writeFile(htmlPath, renderReport(summary));
console.log(`API HTML report: ${htmlPath}`);
