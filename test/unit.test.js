const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const repo = require('../dist/repo')
const { parseArguments } = require('../dist/cli/index')

const options = (overrides = {}) => ({
  installPlaywright: false,
  createPlaywrightConfig: true,
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

test('creates and safely extends Playwright configuration', async (t) => {
  const root = await temporaryDirectory()
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  await repo.generatePlaywrightConfig(root, options())
  let config = await fsp.readFile(
    path.join(root, 'playwright.config.ts'),
    'utf8',
  )
  assert.match(config, /name: 'ui'/)
  assert.match(config, /name: 'api'/)

  await fsp.writeFile(
    path.join(root, 'playwright.config.ts'),
    "import { defineConfig } from '@playwright/test'\n\n// keep me\nexport default defineConfig({ timeout: 1000 })\n",
  )
  await repo.generatePlaywrightConfig(
    root,
    options({ createPlaywrightConfig: false, testSuites: ['integration'] }),
  )
  config = await fsp.readFile(path.join(root, 'playwright.config.ts'), 'utf8')
  assert.match(config, /\/\/ keep me/)
  assert.match(config, /name: 'integration'/)
  assert.match(config, /timeout: 1000/)
  await repo.generatePlaywrightConfig(
    root,
    options({ createPlaywrightConfig: false, testSuites: ['integration'] }),
  )
  config = await fsp.readFile(path.join(root, 'playwright.config.ts'), 'utf8')
  assert.equal(config.match(/name: 'integration'/g).length, 1)
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

test('merges package.json without replacing existing values', async (t) => {
  const root = await temporaryDirectory()
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  await fsp.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      scripts: { test: 'custom-test' },
      devDependencies: { typescript: '1.0.0' },
    }),
  )
  await repo.updatePackageJson(root, options({ installPlaywright: true }))
  const packageJson = JSON.parse(
    await fsp.readFile(path.join(root, 'package.json'), 'utf8'),
  )
  assert.equal(packageJson.scripts.test, 'custom-test')
  assert.equal(packageJson.scripts['test:ui'], 'playwright test --ui')
  assert.equal(packageJson.devDependencies.typescript, '1.0.0')
  assert.equal(packageJson.devDependencies['@playwright/test'], 'latest')
  assert.equal(
    fs.existsSync(path.join(root, 'package.json.playwright-scaffolder.tmp')),
    false,
  )
})

test('parses non-interactive CLI options', () => {
  assert.deepEqual(
    parseArguments([
      '--yes',
      '--install-playwright',
      '--architecture=page-objects',
      '--suites=ui,integration',
    ]),
    {
      yes: true,
      installPlaywright: true,
      createPlaywrightConfig: false,
      architecture: 'page-objects',
      testSuites: ['ui', 'integration'],
    },
  )
})
