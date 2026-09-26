const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { promisify } = require('node:util')

const repo = require('../dist/repo')
const execFileAsync = promisify(execFile)

test('scaffolds a complete project with internally valid imports', async (t) => {
  const root = await fsp.mkdtemp(
    path.join(os.tmpdir(), 'playwright-scaffolder-integration-'),
  )
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  const scaffoldOptions = {
    installPlaywright: true,
    createPlaywrightConfig: true,
    architecture: 'page-objects-components',
    testSuites: ['ui', 'api', 'integration'],
  }
  await fsp.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', scripts: { lint: 'custom-lint' } }),
  )
  const plan = repo.buildFilePlan(scaffoldOptions)
  repo.scaffoldProject(root, plan.directories)
  await repo.writePlannedFiles(root, plan)
  await repo.generatePlaywrightConfig(root, scaffoldOptions)
  await repo.updatePackageJson(root, scaffoldOptions)

  for (const file of plan.files)
    assert.equal((await fsp.stat(path.join(root, file.path))).isFile(), true)
  const fixture = await fsp.readFile(
    path.join(root, 'tests/fixtures/test.ts'),
    'utf8',
  )
  assert.match(fixture, /\.\.\/pages\/example\.page/)
  await fsp.access(path.join(root, 'tests/pages/example.page.ts'))

  const playwrightTypes = path.join(
    root,
    'node_modules/@playwright/test/index.d.ts',
  )
  await fsp.mkdir(path.dirname(playwrightTypes), { recursive: true })
  await fsp.writeFile(
    playwrightTypes,
    `export type Locator = { readonly value: unknown }
export type Page = { goto(url: string): Promise<void>; getByTestId(id: string): Locator }
export const test: { extend<T>(fixtures: Record<string, unknown>): unknown }
export const expect: unknown
export function defineConfig(config: unknown): unknown
`,
  )
  await fsp.writeFile(
    path.join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'commonjs',
        target: 'es2022',
        strict: false,
        skipLibCheck: true,
      },
      include: ['tests/**/*.ts'],
    }),
  )
  await execFileAsync(
    path.resolve(__dirname, '../node_modules/.bin/tsc'),
    ['--noEmit', '--project', path.join(root, 'tsconfig.json')],
    { cwd: root },
  )
  const packageJson = JSON.parse(
    await fsp.readFile(path.join(root, 'package.json'), 'utf8'),
  )
  assert.equal(packageJson.scripts.lint, 'custom-lint')
})
