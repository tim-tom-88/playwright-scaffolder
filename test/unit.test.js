const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const repo = require('../dist/repo')
const { parseArguments } = require('../dist/cli/index')

const options = (overrides = {}) => ({
  architecture: 'page-objects-components',
  testSuites: ['ui', 'api'],
  ...overrides,
})

const temporaryDirectory = async () =>
  fsp.mkdtemp(path.join(os.tmpdir(), 'playwright-scaffolder-'))

test('detects a nested Playwright project and its package manager', async (t) => {
  const root = await temporaryDirectory()
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  await fsp.writeFile(path.join(root, 'package.json'), '{}')
  await fsp.writeFile(path.join(root, 'pnpm-lock.yaml'), '')
  await fsp.mkdir(path.join(root, 'apps', 'web'), { recursive: true })
  await fsp.writeFile(
    path.join(root, 'apps', 'web', 'package.json'),
    JSON.stringify({ devDependencies: { '@playwright/test': '1.0.0' } }),
  )
  await fsp.writeFile(
    path.join(root, 'apps', 'web', 'playwright.config.ts'),
    '',
  )

  assert.equal(repo.findPackageJson(path.join(root, 'apps')), root)
  assert.equal(repo.detectPackageManager(root), 'pnpm')
  assert.deepEqual(repo.detectPlaywright(root), {
    playwrightRoot: path.join(root, 'apps', 'web'),
    playwrightConfig: 'playwright.config.ts',
  })
})

test('isolates the filesystem boundary when checking TypeScript setup', (t) => {
  t.mock.method(
    fs,
    'existsSync',
    (candidate) => candidate === path.join('/virtual-project', 'tsconfig.json'),
  )
  assert.equal(repo.findTsConfig('/virtual-project'), true)
  assert.equal(repo.findTsConfig('/another-project'), false)
})

test('builds architecture-specific file plans', () => {
  const full = repo.buildFilePlan(options())
  assert.ok(full.files.some((file) => file.path.endsWith('example.page.ts')))
  assert.ok(
    full.files.some((file) => file.path.endsWith('example.component.ts')),
  )
  assert.ok(full.files.some((file) => file.path.endsWith('fixtures/test.ts')))
  const minimal = repo.buildFilePlan(
    options({ architecture: 'none', testSuites: [] }),
  )
  assert.deepEqual(minimal.files, [])
})

test('parses non-interactive CLI options', () => {
  assert.deepEqual(
    parseArguments([
      '--yes',
      '--architecture=page-objects',
      '--suites=ui,integration',
    ]),
    {
      yes: true,
      architecture: 'page-objects',
      testSuites: ['ui', 'integration'],
    },
  )
})

test('rejects obsolete bootstrap flags', () => {
  assert.throws(
    () => parseArguments(['--install-playwright']),
    /npm init playwright@latest/,
  )
})

test('BDD plans replace specs with features and architecture-aware steps', () => {
  for (const architecture of [
    'none',
    'page-objects',
    'page-objects-components',
  ]) {
    const plan = repo.buildFilePlan(
      options({
        architecture,
        bdd: true,
        testSuites: ['ui', 'api', 'integration'],
      }),
      'playwright.config.mjs',
    )
    const files = new Map(plan.files.map((file) => [file.path, file.content]))
    for (const suite of ['ui', 'api', 'integration']) {
      assert.match(
        files.get(`tests/features/${suite}/example.feature`),
        /Scenario:.*\n    Then /,
      )
      assert.match(
        files.get(`tests/steps/${suite}.steps.ts`),
        /createBdd\(test\)/,
      )
      assert.equal(files.has(`tests/${suite}/example.spec.ts`), false)
    }
    assert.match(
      files.get('playwright.bdd.config.ts'),
      /from '\.\/playwright.config.mjs'/,
    )
    assert.ok(!plan.directories.includes('BDD.m'))
    if (architecture !== 'none') {
      assert.match(files.get('tests/fixtures/test.ts'), /from 'playwright-bdd'/)
      assert.match(files.get('tests/steps/ui.steps.ts'), /examplePage/)
    }
  }
  assert.deepEqual(parseArguments(['--yes', '--bdd']), { yes: true, bdd: true })
})

test('installs BDD with each supported package manager in the target package', async (t) => {
  const childProcess = require('node:child_process')
  const { EventEmitter } = require('node:events')
  const calls = []
  t.mock.method(childProcess, 'spawn', (command, args, options) => {
    calls.push({ command, args, options })
    const child = new EventEmitter()
    process.nextTick(() => child.emit('exit', 0, null))
    return child
  })
  for (const manager of ['npm', 'yarn', 'pnpm', 'bun']) {
    await repo.installBdd('/target/package', manager)
    const call = calls.at(-1)
    assert.equal(call.command, manager)
    assert.equal(call.options.cwd, '/target/package')
    assert.deepEqual(
      call.args,
      manager === 'npm'
        ? ['install', '--save-dev', 'playwright-bdd']
        : ['add', '--dev', 'playwright-bdd'],
    )
  }
})

test('reports an actionable error when the package manager cannot start', async (t) => {
  const { EventEmitter } = require('node:events')
  t.mock.method(require('node:child_process'), 'spawn', () => {
    const child = new EventEmitter()
    process.nextTick(() => child.emit('error', new Error('ENOENT')))
    return child
  })
  await assert.rejects(
    repo.installBdd('/target/package', 'pnpm'),
    /Retry pnpm add --dev playwright-bdd in \/target\/package/,
  )
})
