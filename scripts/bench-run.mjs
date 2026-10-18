/**
 * Paired bench runner for DSH Community Bench.
 *
 * One run = one task, one arm (`with` or `without`), one isolated profile.
 * The runner never reads or writes the user's real `~/.dsh`; it creates a
 * throwaway DSH_HOME, installs the candidate only in the `with` arm, runs the
 * task through the headless profile, executes the task checks, and writes a
 * result JSON with hashes and a signature when a key is supplied.
 *
 * Usage:
 *   node scripts/bench-run.mjs --task memory-recall --plugin perrylink/dsh-memento \
 *     --spec dsh-memento --version 0.5.25 --arm with --repeat 3 --dry-run
 *
 *   node scripts/bench-run.mjs --task memory-recall --plugin perrylink/dsh-memento \
 *     --spec dsh-memento --version 0.5.25 --arm without --repeat 3
 *
 * Result files go to `data/results/` by default. They are unsigned unless
 * `--signing-key` names an Ed25519 private key PEM. An unsigned result is
 * `self` evidence and should be replicated before it counts as verified.
 *
 * @module dsh-attention-index/bench-run
 */

import { spawn } from 'node:child_process'
import { createHash, createPrivateKey, sign } from 'node:crypto'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Parse `--key value` and `--flag` arguments. */
function parseArgs(argv) {
  const args = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) { args._.push(token); continue }
    const key = token.slice(2)
    if (key === 'dry-run' || key === 'keep' || key === 'allow-commands' || key === 'sandbox') { args[key] = true; continue }
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for --${key}`)
    args[key] = value
    index += 1
  }
  return args
}

/** Stable JSON for signatures. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** SHA-256 hex of bytes. */
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Minimal environment for child runs: no ambient tokens, SSH agents or npm credentials. */
export function minimalEnv(extra = {}) {
  const env = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    LANG: process.env.LANG ?? 'C.UTF-8',
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
  }
  for (const key of ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL']) {
    if (process.env[key] !== undefined) env[key] = process.env[key]
  }
  return { ...env, ...extra }
}

/** Deterministic hash of a fixture directory (relative paths + bytes). */
export async function hashDir(dir) {
  if (!existsSync(dir)) return null
  const files = []
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile()) files.push(path)
    }
  }
  await walk(dir)
  files.sort()
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(relative(dir, file))
    hash.update('\0')
    hash.update(await readFile(file))
    hash.update('\0')
  }
  return `sha256:${hash.digest('hex')}`
}

/** Run one child process and capture stdout/stderr with a timeout. */
function run(command, args, options = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: minimalEnv(options.env),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      resolvePromise({ code: 124, stdout, stderr: `${stderr}\nbench-run: timeout after ${options.timeoutMs ?? 300000}ms` })
    }, options.timeoutMs ?? 300000)
    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8') })
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8') })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolvePromise({ code: 1, stdout, stderr: `${stderr}\n${String(error)}` })
    })
    child.on('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolvePromise({ code: code ?? 1, stdout, stderr })
    })
  })
}

/** Parse the headless `--json` NDJSON stream. */
export function parseHeadlessJson(stdout) {
  const events = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    try { events.push(JSON.parse(trimmed)) } catch { /* non-JSON diagnostics stay out */ }
  }
  const final = [...events].reverse().find(event => event.type === 'final')
  const text = typeof final?.text === 'string' ? final.text : ''
  const toolCalls = events.filter(event => event.type === 'tool_call').length
  const toolResults = events.filter(event => event.type === 'tool_result').length
  const toolErrors = events.filter(event => event.type === 'tool_result' && (event.is_error === true || event.isError === true)).length
  const tokens = events.reduce((sum, event) => sum + (Number(event.usage?.totalTokens) || 0), 0)
  return { events, text, toolCalls, toolResults, toolErrors, tokens }
}

/** Resolve the newest session log file under a throwaway DSH_HOME. */
async function newestSessionFile(home) {
  const sessions = join(home, 'sessions')
  if (!existsSync(sessions)) return undefined
  const found = []
  const walk = async (dir) => {
    const { readdir } = await import('node:fs/promises')
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.name.endsWith('.jsonl.zstd') || entry.name.endsWith('.jsonl')) found.push(path)
    }
  }
  await walk(sessions)
  if (found.length === 0) return undefined
  const withStats = await Promise.all(found.map(async path => ({ path, mtime: (await stat(path)).mtimeMs })))
  withStats.sort((left, right) => right.mtime - left.mtime)
  return withStats[0].path
}

/** Evaluate one task check against the run. */
async function evaluateCheck(check, context) {
  const id = check.id ?? check.kind ?? 'check'
  if (check.kind === 'answer-contains') {
    const pass = context.answer.toLowerCase().includes(String(check.value ?? '').toLowerCase())
    return { id, pass, detail: pass ? 'answer contains the expected text' : `answer does not contain ${JSON.stringify(check.value)}` }
  }
  if (check.kind === 'no-clarifying-question') {
    const pass = !/\?\s*$/.test(context.answer.trim())
    return { id, pass, detail: pass ? 'answer does not end in a question' : 'answer ends in a question' }
  }
  if (check.kind === 'file-exists') {
    const pass = existsSync(join(context.workspace, check.path ?? ''))
    return { id, pass, detail: `file ${check.path} exists=${pass}` }
  }
  if (check.kind === 'file-equals') {
    const path = join(context.workspace, check.path ?? '')
    const pass = existsSync(path) && (await readFile(path, 'utf8')) === String(check.value ?? '')
    return { id, pass, detail: `file ${check.path} equals expected=${pass}` }
  }
  if (check.kind === 'file-contains') {
    const path = join(context.workspace, check.path ?? '')
    const pass = existsSync(path) && (await readFile(path, 'utf8')).includes(String(check.value ?? ''))
    return { id, pass, detail: `file ${check.path} contains expected=${pass}` }
  }
  if (check.kind === 'file-not-contains') {
    const path = join(context.workspace, check.path ?? '')
    const pass = existsSync(path) && !(await readFile(path, 'utf8')).includes(String(check.value ?? ''))
    return { id, pass, detail: `file ${check.path} excludes ${JSON.stringify(check.value)}=${pass}` }
  }
  if (check.kind === 'command-exit-zero') {
    if (context.allowCommands !== true) return { id, pass: false, detail: 'command checks require --allow-commands' }
    const result = await run('/bin/sh', ['-lc', String(check.command ?? '')], { cwd: context.workspace, env: { HOME: context.home ?? process.env.HOME, DEEPSEEK_API_KEY: '' }, timeoutMs: 120000 })
    return { id, pass: result.code === 0, detail: `command exit ${result.code}` }
  }
  return { id, pass: false, detail: `unknown check kind ${check.kind}` }
}

/** Sign a result with an Ed25519 PEM key. */
function signResult(result, keyPath) {
  if (keyPath === undefined) return undefined
  const key = createPrivateKey({ key: readFileSync(keyPath, 'utf8'), format: 'pem' })
  return sign(null, Buffer.from(canonicalJson(result)), key).toString('base64')
}

/** Main. */
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const taskId = args.task
  if (typeof taskId !== 'string') throw new Error('--task is required')
  const arm = args.arm ?? 'with'
  if (arm !== 'with' && arm !== 'without') throw new Error('--arm must be with or without')
  const repeat = Math.max(1, Number(args.repeat ?? 3))
  const tasksFile = JSON.parse(await readFile(resolve(ROOT, args.pack ?? 'data/tasks.json'), 'utf8'))
  const task = tasksFile.tasks.find(item => item.id === taskId)
  if (task === undefined) throw new Error(`unknown task ${taskId}`)
  if (task.status === 'draft') throw new Error(`task ${taskId} is a draft: add executable checks and a fixture before running it`)
  if (!Array.isArray(task.checks) || task.checks.length === 0 || task.checks.some(check => typeof check.kind !== 'string')) {
    throw new Error(`task ${taskId} has no executable checks (each check needs a kind)`)
  }
  const pluginId = args.plugin ?? 'unknown/unknown'
  const pluginVersion = args.version ?? 'unknown'
  const outDir = resolve(ROOT, args.out ?? 'data/results')
  const dsh = args.dsh ?? 'dsh'
  const profile = args.profile ?? 'headless'
  const fixtures = resolve(ROOT, args.fixtures ?? 'fixtures')
  const runnerId = args.runner ?? 'github:local'
  const model = args.model ?? task.model ?? 'deepseek-flash'
  const harness = args.harness ?? task.harness ?? 'unknown'
  const timeoutMs = Number(args.timeoutMs ?? 300000)
  const dryRun = args['dry-run'] === true
  const keep = args.keep === true
  const allowCommands = args['allow-commands'] === true
  const sandbox = args.sandbox === true
  const bwrap = args.bwrap ?? process.env.DSH_BENCH_BWRAP ?? 'bwrap'
  const nodeRoot = args['node-root'] ?? process.env.DSH_BENCH_NODE_ROOT
  const checkout = args.checkout ?? process.env.DSH_BENCH_CHECKOUT
  if (sandbox && (typeof nodeRoot !== 'string' || typeof checkout !== 'string')) {
    throw new Error('--sandbox requires --node-root and --checkout (or DSH_BENCH_NODE_ROOT / DSH_BENCH_CHECKOUT)')
  }
  const dshCommand = sandbox ? join(ROOT, 'scripts/bench-sandbox.sh') : dsh
  const sandboxEnv = sandbox ? { DSH_BENCH_BWRAP: bwrap, DSH_BENCH_NODE_ROOT: nodeRoot, DSH_BENCH_CHECKOUT: checkout } : {}

  if (arm === 'with' && (typeof args.spec !== 'string' || args.spec.length === 0) && dryRun === false) {
    throw new Error('--spec is required for the with arm (npm name, git spec, tarball or local path)')
  }

  const plan = {
    task: task.id,
    arm,
    repeat,
    plugin: { id: pluginId, version: pluginVersion },
    spec: args.spec ?? null,
    model,
    harness,
    checks: task.checks,
  }
  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      plan,
      commands: Array.from({ length: repeat }, (_, index) => ({
        run: index + 1,
        install: arm === 'with' ? `${dsh} plugin --profile ${profile} add ${args.spec}` : null,
        task: `${dsh} --profile ${profile} --json ${JSON.stringify(task.prompt)}`,
        env: ['DSH_HOME=<temp>', 'DEEPSEEK_API_KEY=<forwarded>'],
      })),
    }, null, 2))
    return
  }

  await mkdir(outDir, { recursive: true })
  for (let index = 0; index < repeat; index += 1) {
    const temp = await mkdtemp(join(tmpdir(), 'dsh-bench-'))
    const home = join(temp, 'dsh-home')
    const workspace = join(temp, 'workspace')
    await mkdir(home, { recursive: true })
    await mkdir(workspace, { recursive: true })
    const fixture = join(fixtures, task.id)
    if (existsSync(fixture)) await cp(fixture, workspace, { recursive: true })
    else await writeFile(join(workspace, 'README.md'), `# Bench workspace for ${task.id}\n`)

    let install = { code: 0, stdout: '', stderr: '' }
    if (arm === 'with') {
      install = await run(dshCommand, ['plugin', '--profile', profile, 'add', args.spec], {
        cwd: workspace, env: { DSH_HOME: home, HOME: home, ...sandboxEnv }, timeoutMs: 600000,
      })
      if (install.code !== 0) {
        console.error(`install failed for ${pluginId}: ${install.code}`)
        console.error(install.stderr.slice(-2000))
        if (!keep) await rm(temp, { recursive: true, force: true })
        continue
      }
    }

    const startedAt = new Date().toISOString()
    const started = Date.now()
    const runResult = await run(dshCommand, ['--profile', profile, '--json', task.prompt], {
      cwd: workspace,
      env: { DSH_HOME: home, HOME: home, ...sandboxEnv },
      timeoutMs,
    })
    const durationMs = Date.now() - started
    const parsed = parseHeadlessJson(runResult.stdout)
    const checks = []
    for (const check of task.checks ?? []) checks.push(await evaluateCheck(check, { workspace, home, answer: parsed.text, allowCommands }))
    const pass = runResult.code === 0 && checks.length > 0 && checks.every(check => check.pass)
    const sessionFile = await newestSessionFile(home)
    const sessionBytes = sessionFile === undefined ? Buffer.alloc(0) : await readFile(sessionFile)
    const sessionHash = `sha256:${sha256(sessionBytes)}`
    const artifacts = []
    const fixtureHash = await hashDir(fixture)
    const environment = {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      dsh: args['dsh-version'] ?? 'unknown',
      model,
      harness,
      profile,
      sandbox: sandbox ? 'bwrap-fs' : 'none',
      sandboxStrength: sandbox ? 'fs' : 'none',
      fixtureHash,
    }
    const result = {
      schema: 'dsh-attention/bench-result/v1',
      runId: `br_${Date.now().toString(36)}_${index + 1}`,
      taskId: task.id,
      plugin: { id: pluginId, version: pluginVersion },
      arm,
      model,
      harness,
      startedAt,
      finishedAt: new Date().toISOString(),
      outcome: { pass, checks },
      metrics: { tokens: parsed.tokens, durationMs, toolErrors: parsed.toolErrors },
      sessionHash,
      artifacts,
      environment,
      environmentBound: sandbox,
      sandbox: sandbox ? 'bwrap-fs' : 'none',
      sandboxStrength: sandbox ? 'fs' : 'none',
      runner: { id: runnerId, ...(typeof args['key-id'] === 'string' ? { keyId: args['key-id'] } : {}) },
    }
    const signature = signResult(result, args['signing-key'])
    if (signature !== undefined) result.signature = signature
    const file = join(outDir, `${result.runId}.json`)
    await writeFile(file, `${JSON.stringify(result, null, 2)}\n`)
    console.log(`${pass ? 'PASS' : 'FAIL'} ${task.id} ${arm} · ${pluginId} · ${durationMs}ms · ${file}`)
    if (!keep) await rm(temp, { recursive: true, force: true })
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`bench-run: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
}
