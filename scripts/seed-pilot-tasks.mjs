/**
 * Seed the P1 pilot task pack: 3 briefs x 6 offline-executable tasks.
 *
 * These tasks are deliberately marked `status: "pilot"` and `reviewed: false`.
 * They can exercise the runner and produce E2 provisional evidence, but they
 * must not be used to claim E3+ until an independent review and pre-registration
 * land. No task invents a result; the fixtures are local and deterministic.
 *
 * Usage:
 *   node scripts/seed-pilot-tasks.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TASKS_PATH = join(ROOT, 'data/tasks.json')
const FIXTURES = join(ROOT, 'fixtures')

const NOTES = `# Project conventions

- Deploy target: staging-eu
- Freeze window: Friday 18:00 UTC
- API base: https://api.example.test/v2
- Service owner: Dana
- Migration cutoff: 2026-11-03
- Cache TTL: 900 seconds
`

const PAGE = `<!doctype html>
<html><head><title>Atlas release notes</title></head>
<body>
<h1>Atlas 4.2.0</h1>
<p>Version 4.2.0 shipped on 2026-09-14.</p>
<p>Breaking change: <code>client.timeout</code> now defaults to 30s.</p>
<p>Known issue: proxy retries are disabled.</p>
<table><tr><th>Plan</th><th>Price</th></tr><tr><td>Basic</td><td>$12</td></tr><tr><td>Pro</td><td>$29</td></tr></table>
</body></html>
`

function answerCheck(value) {
  return [
    { id: 'answer', kind: 'answer-contains', value, description: `Final answer contains ${JSON.stringify(value)}` },
    { id: 'no-question', kind: 'no-clarifying-question', description: 'Agent does not end with a clarifying question' },
  ]
}

const tasks = [
  {
    id: 'p1-memory-deploy',
    surface: 'memory',
    brief: 'memory',
    title: 'Recall the deploy target from workspace notes',
    intent: 'Read a local convention note and answer with the exact deploy target.',
    prompt: 'Read notes.md in the current workspace. What is the deploy target? Answer with the exact value only, and do not ask a clarifying question.',
    checks: answerCheck('staging-eu'),
    fixture: { 'notes.md': NOTES },
  },
  {
    id: 'p1-memory-freeze',
    surface: 'memory',
    brief: 'memory',
    title: 'Recall the freeze window',
    intent: 'Answer a date/time fact from a local note.',
    prompt: 'Read notes.md in the current workspace. When is the freeze window? Answer with the exact text, and do not ask a clarifying question.',
    checks: answerCheck('Friday 18:00 UTC'),
    fixture: { 'notes.md': NOTES },
  },
  {
    id: 'p1-memory-api',
    surface: 'memory',
    brief: 'memory',
    title: 'Recall the API base URL',
    intent: 'Answer with an exact URL from a local note.',
    prompt: 'Read notes.md in the current workspace. What is the API base URL? Answer with the exact URL only.',
    checks: answerCheck('https://api.example.test/v2'),
    fixture: { 'notes.md': NOTES },
  },
  {
    id: 'p1-memory-owner',
    surface: 'memory',
    brief: 'memory',
    title: 'Recall the service owner',
    intent: 'Answer with a person name from a local note.',
    prompt: 'Read notes.md in the current workspace. Who owns the service? Answer with the exact name only.',
    checks: answerCheck('Dana'),
    fixture: { 'notes.md': NOTES },
  },
  {
    id: 'p1-memory-cutoff',
    surface: 'memory',
    brief: 'memory',
    title: 'Recall the migration cutoff',
    intent: 'Answer with an ISO date from a local note.',
    prompt: 'Read notes.md in the current workspace. What is the migration cutoff? Answer with the ISO date only.',
    checks: answerCheck('2026-11-03'),
    fixture: { 'notes.md': NOTES },
  },
  {
    id: 'p1-memory-ttl',
    surface: 'memory',
    brief: 'memory',
    title: 'Recall the cache TTL',
    intent: 'Answer with a number in seconds from a local note.',
    prompt: 'Read notes.md in the current workspace. What is the cache TTL in seconds? Answer with the number only.',
    checks: answerCheck('900'),
    fixture: { 'notes.md': NOTES },
  },
  {
    id: 'p1-web-version',
    surface: 'web',
    brief: 'web',
    title: 'Extract the release version from a page snapshot',
    intent: 'Read a local HTML snapshot and return one exact field.',
    prompt: 'Read page.html in the current workspace. What version shipped? Answer with the exact version only.',
    checks: answerCheck('4.2.0'),
    fixture: { 'page.html': PAGE },
  },
  {
    id: 'p1-web-date',
    surface: 'web',
    brief: 'web',
    title: 'Extract the release date',
    intent: 'Read a local HTML snapshot and return the ISO date.',
    prompt: 'Read page.html in the current workspace. What date did the release ship? Answer with the ISO date only.',
    checks: answerCheck('2026-09-14'),
    fixture: { 'page.html': PAGE },
  },
  {
    id: 'p1-web-breaking',
    surface: 'web',
    brief: 'web',
    title: 'Identify the breaking-change field',
    intent: 'Extract the exact code identifier named in a page snapshot.',
    prompt: 'Read page.html in the current workspace. Which code field is the breaking change? Answer with the exact identifier only.',
    checks: answerCheck('client.timeout'),
    fixture: { 'page.html': PAGE },
  },
  {
    id: 'p1-web-default',
    surface: 'web',
    brief: 'web',
    title: 'Extract the new default timeout',
    intent: 'Extract a value and its unit from a page snapshot.',
    prompt: 'Read page.html in the current workspace. What is the new default timeout? Include the unit, and answer with the value only.',
    checks: answerCheck('30s'),
    fixture: { 'page.html': PAGE },
  },
  {
    id: 'p1-web-price',
    surface: 'web',
    brief: 'web',
    title: 'Extract a table price',
    intent: 'Read a small HTML table and return one exact price.',
    prompt: 'Read page.html in the current workspace. What is the Pro plan price? Answer with the exact price only.',
    checks: answerCheck('$29'),
    fixture: { 'page.html': PAGE },
  },
  {
    id: 'p1-web-issue',
    surface: 'web',
    brief: 'web',
    title: 'Extract the known issue',
    intent: 'Return an exact phrase from a page snapshot.',
    prompt: 'Read page.html in the current workspace. What known issue is listed? Quote the exact phrase only.',
    checks: answerCheck('proxy retries are disabled'),
    fixture: { 'page.html': PAGE },
  },
  {
    id: 'p1-dev-add',
    surface: 'dev',
    brief: 'dev',
    title: 'Fix an addition bug',
    intent: 'Repair a small JavaScript function and pass a local test.',
    prompt: 'Fix bug.js in the current workspace so `node test.js` passes. Keep the exported function name. Do not ask a clarifying question.',
    checks: [
      { id: 'test', kind: 'command-exit-zero', command: 'node test.js', description: 'node test.js exits 0' },
      { id: 'add', kind: 'file-contains', path: 'bug.js', value: 'a + b', description: 'bug.js adds instead of subtracts' },
    ],
    fixture: {
      'package.json': '{\n  "type": "module"\n}\n',
      'bug.js': 'export function add(a, b) {\n  return a - b\n}\n',
      'test.js': "import assert from 'node:assert/strict'\nimport { add } from './bug.js'\nassert.equal(add(2, 3), 5)\nconsole.log('ok')\n",
    },
  },
  {
    id: 'p1-dev-config',
    surface: 'dev',
    brief: 'dev',
    title: 'Bump a version in JSON',
    intent: 'Edit a JSON config without breaking its syntax.',
    prompt: 'In config.json in the current workspace, change the version to 2.0.0. Keep the file valid JSON.',
    checks: [
      { id: 'version', kind: 'file-contains', path: 'config.json', value: '"2.0.0"', description: 'config.json contains version 2.0.0' },
    ],
    fixture: {
      'config.json': '{\n  "name": "demo",\n  "version": "1.0.0"\n}\n',
    },
  },
  {
    id: 'p1-dev-test',
    surface: 'dev',
    brief: 'dev',
    title: 'Add a regression test and fix the bug',
    intent: 'Create a runnable test that demonstrates the fix.',
    prompt: 'Fix sum.js in the current workspace and add sum.test.js using node:assert that runs with `node sum.test.js`. Do not ask a clarifying question.',
    checks: [
      { id: 'test-exists', kind: 'file-exists', path: 'sum.test.js', description: 'sum.test.js exists' },
      { id: 'test', kind: 'command-exit-zero', command: 'node sum.test.js', description: 'node sum.test.js exits 0' },
      { id: 'sum', kind: 'file-contains', path: 'sum.js', value: 'a + b', description: 'sum.js adds' },
    ],
    fixture: {
      'package.json': '{\n  "type": "module"\n}\n',
      'sum.js': 'export function sum(a, b) {\n  return a - b\n}\n',
    },
  },
  {
    id: 'p1-dev-readme',
    surface: 'dev',
    brief: 'dev',
    title: 'Add a usage section',
    intent: 'Document a command without inventing a different CLI.',
    prompt: 'In README.md in the current workspace, add a "## Usage" section that contains the exact command `node tool.js`. Keep the existing title.',
    checks: [
      { id: 'usage', kind: 'file-contains', path: 'README.md', value: '## Usage', description: 'README has a Usage section' },
      { id: 'command', kind: 'file-contains', path: 'README.md', value: 'node tool.js', description: 'README names the command' },
    ],
    fixture: { 'README.md': '# Tool\n\nA small demo.\n' },
  },
  {
    id: 'p1-dev-eval',
    surface: 'dev',
    brief: 'dev',
    title: 'Replace eval with JSON.parse',
    intent: 'Remove an unsafe eval from a small server handler.',
    prompt: 'In server.js in the current workspace, replace eval(input) with JSON.parse(input). Do not leave an eval call.',
    checks: [
      { id: 'parse', kind: 'file-contains', path: 'server.js', value: 'JSON.parse(input)', description: 'server.js uses JSON.parse(input)' },
      { id: 'no-eval', kind: 'file-not-contains', path: 'server.js', value: 'eval(', description: 'server.js has no eval(' },
    ],
    fixture: {
      'server.js': "export function handle(input) {\n  return eval(input)\n}\n",
    },
  },
  {
    id: 'p1-dev-package',
    surface: 'dev',
    brief: 'dev',
    title: 'Declare an ES module package',
    intent: 'Add the module type to a package manifest.',
    prompt: 'In package.json in the current workspace, add "type": "module". Keep the JSON valid.',
    checks: [
      { id: 'type', kind: 'file-contains', path: 'package.json', value: '"type": "module"', description: 'package.json declares type module' },
    ],
    fixture: {
      'package.json': '{\n  "name": "demo",\n  "version": "1.0.0"\n}\n',
    },
  },
  {
    id: 'p1-memory-recency',
    surface: 'memory',
    brief: 'memory',
    title: 'Prefer the most recent note',
    intent: 'Resolve a stale value against a dated update.',
    prompt: 'Read notes-recency.md in the current workspace. What is the current cache TTL in seconds? Use the most recent note and answer with the number only.',
    checks: answerCheck('1200'),
    fixture: {
      'notes-recency.md': '# Deploy notes\n\n- Cache TTL: 900 seconds\n- Update (2026-10-01): Cache TTL is now 1200 seconds.\n',
    },
  },
  {
    id: 'p1-memory-provenance',
    surface: 'memory',
    brief: 'memory',
    title: 'Name the source of a fact',
    intent: 'Return the provenance attached to a local fact.',
    prompt: 'Read notes-source.md in the current workspace. What source is cited for the deploy target? Answer with the source name only.',
    checks: answerCheck('runbook'),
    fixture: {
      'notes-source.md': '# Release note\n\nDeploy target: staging-eu\nSource: runbook\nOwner: Dana\n',
    },
  },
  {
    id: 'p1-web-author',
    surface: 'web',
    brief: 'web',
    title: 'Extract the page author',
    intent: 'Read a meta tag from a local snapshot.',
    prompt: 'Read page-author.html in the current workspace. Who is the author? Answer with the exact author name only.',
    checks: answerCheck('Atlas Team'),
    fixture: {
      'page-author.html': '<!doctype html><html><head><meta name="author" content="Atlas Team"><title>Atlas</title></head><body>Atlas</body></html>\n',
    },
  },
  {
    id: 'p1-web-updated',
    surface: 'web',
    brief: 'web',
    title: 'Extract the updated date',
    intent: 'Read a time element from a local snapshot.',
    prompt: 'Read page-updated.html in the current workspace. What date was the page updated? Answer with the ISO date only.',
    checks: answerCheck('2026-10-01'),
    fixture: {
      'page-updated.html': '<!doctype html><html><body><time datetime="2026-10-01">October 1, 2026</time></body></html>\n',
    },
  },
  {
    id: 'p1-dev-json',
    surface: 'dev',
    brief: 'dev',
    title: 'Repair invalid JSON',
    intent: 'Remove a trailing comma and keep the data intact.',
    prompt: 'In data.json in the current workspace, remove the trailing comma so the file is valid JSON. Keep the key and value.',
    checks: [
      { id: 'valid', kind: 'command-exit-zero', command: "node -e \"JSON.parse(require('fs').readFileSync('data.json','utf8'))\"", description: 'data.json parses' },
      { id: 'comma', kind: 'file-not-contains', path: 'data.json', value: ',}', description: 'no trailing comma' },
    ],
    fixture: {
      'data.json': '{\n  "answer": 42,\n}\n',
    },
  },
  {
    id: 'p1-dev-import',
    surface: 'dev',
    brief: 'dev',
    title: 'Fix an import path',
    intent: 'Point an import at the existing module file.',
    prompt: 'In main.js in the current workspace, fix the import so it points to utils.js. Keep the exported function.',
    checks: [
      { id: 'import', kind: 'file-contains', path: 'main.js', value: "./utils.js", description: 'main.js imports utils.js' },
    ],
    fixture: {
      'main.js': "import { value } from './util.js'\nexport const answer = value\n",
      'utils.js': 'export const value = 42\n',
    },
  },
]

const tasksFile = JSON.parse(readFileSync(TASKS_PATH, 'utf8'))
const existing = new Map(tasksFile.tasks.map(task => [task.id, task]))
for (const task of tasks) {
  existing.set(task.id, {
    ...task,
    status: 'pilot',
    reviewed: false,
    model: 'deepseek-flash',
    harness: '0.2.1-rc.2',
    weight: 1,
    checks: task.checks.map(check => ({ ...check })),
  })
  const fixtureDir = join(FIXTURES, task.id)
  for (const [name, content] of Object.entries(task.fixture ?? {})) {
    const target = join(fixtureDir, name)
    if (!existsSync(target)) {
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content)
    }
  }
  delete existing.get(task.id).fixture
}
tasksFile.tasks = [...existing.values()]
tasksFile.pilotPack = {
  id: 'p1-pilot-1',
  status: 'unreviewed',
  briefs: ['memory', 'web', 'dev'],
  tasks: tasks.map(task => task.id),
  note: 'Executable offline pilot tasks. E2 provisional at most until independent review and pre-registration.',
}
writeFileSync(TASKS_PATH, `${JSON.stringify(tasksFile, null, 2)}\n`)
console.log(`seeded ${tasks.length} pilot tasks · total ${tasksFile.tasks.length} · ${tasksFile.pilotPack.id}`)
