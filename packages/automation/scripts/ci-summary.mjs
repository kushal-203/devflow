#!/usr/bin/env node
// Turns Playwright's JSON report into a Markdown summary (used for the GitHub Actions job summary).
//   node scripts/ci-summary.mjs [reports/results.json] >> "$GITHUB_STEP_SUMMARY"
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = process.argv[2] || fileURLToPath(new URL('../reports/results.json', import.meta.url));
if (!fs.existsSync(file)) { console.log('No Playwright results found.'); process.exit(0); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));

const rows = [];
const walk = (suite, trail) => {
  const name = [...trail, suite.title].filter(Boolean);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const last = t.results.at(-1);
      rows.push({ project: t.projectName, title: [...name.slice(1), spec.title].join(' › '), status: t.status, duration: last?.duration ?? 0 });
    }
  }
  for (const child of suite.suites ?? []) walk(child, name);
};
for (const s of report.suites) walk(s, []);

const count = (st) => rows.filter((r) => r.status === st).length;
const icon = { expected: '✅', unexpected: '❌', flaky: '⚠️', skipped: '⏭️' };
console.log('## Playwright results\n');
console.log(`| Passed | Failed | Flaky | Skipped | Duration |\n|---|---|---|---|---|\n| ${count('expected')} | ${count('unexpected')} | ${count('flaky')} | ${count('skipped')} | ${(report.stats.duration / 1000).toFixed(1)} s |\n`);
for (const project of [...new Set(rows.map((r) => r.project))]) {
  const list = rows.filter((r) => r.project === project);
  console.log(`<details><summary><b>${project}</b> – ${list.filter((r) => r.status === 'expected').length}/${list.length} passed</summary>\n`);
  console.log('| | Test | Time |\n|---|---|---|');
  for (const r of list) console.log(`| ${icon[r.status] ?? r.status} | ${r.title.replace(/\|/g, '\\|')} | ${(r.duration / 1000).toFixed(1)} s |`);
  console.log('\n</details>\n');
}
