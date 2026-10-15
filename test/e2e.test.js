const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { promisify } = require('node:util')
const test = require('node:test')

const execFileAsync = promisify(execFile)

test('the actual CLI scaffolds a project non-interactively', async (t) => {
  const root = await fsp.mkdtemp(
    path.join(os.tmpdir(), 'playwright-scaffolder-e2e-'),
  )
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  await fsp.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      devDependencies: { '@playwright/test': '^1.0.0' },
    }),
  )

  const originalConfig =
    "export default { testDir: './tests', projects: [{ name: 'chromium' }] }\n"
  await fsp.writeFile(path.join(root, 'playwright.config.ts'), originalConfig)
  const originalPackage = await fsp.readFile(
    path.join(root, 'package.json'),
    'utf8',
  )

  const cli = path.resolve(__dirname, '../dist/cli/index.js')
  const { stdout } = await execFileAsync(
    process.execPath,
    [cli, '--yes', '--architecture=page-objects-components', '--suites=ui,api'],
    { cwd: root },
  )

  assert.match(stdout, /Playwright scaffold created/)
  await fsp.access(path.join(root, 'playwright.config.ts'))
  await fsp.access(path.join(root, 'tests/pages/example.page.ts'))
  await fsp.access(path.join(root, 'tests/components/example.component.ts'))
  const config = await fsp.readFile(
    path.join(root, 'playwright.config.ts'),
    'utf8',
  )
  assert.equal(config, originalConfig)
  assert.equal(
    await fsp.readFile(path.join(root, 'package.json'), 'utf8'),
    originalPackage,
  )
  await fsp.access(path.join(root, 'tests/ui/example.spec.ts'))
  await fsp.access(path.join(root, 'tests/api/example.spec.ts'))
  const pagePath = path.join(root, 'tests/pages/example.page.ts')
  await fsp.writeFile(pagePath, '// user content')
  await execFileAsync(process.execPath, [cli, '--yes'], { cwd: root })
  assert.equal(await fsp.readFile(pagePath, 'utf8'), '// user content')
})

for (const state of ['empty', 'package-only', 'dependency-only']) {
  test(`requires Playwright init for ${state} without writing files`, async (t) => {
    const root = await fsp.mkdtemp(
      path.join(os.tmpdir(), 'qa-playwright-prerequisite-'),
    )
    t.after(() => fsp.rm(root, { recursive: true, force: true }))
    if (state !== 'empty')
      await fsp.writeFile(
        path.join(root, 'package.json'),
        JSON.stringify(
          state === 'dependency-only'
            ? { devDependencies: { '@playwright/test': '1.0.0' } }
            : {},
        ),
      )
    const before = await fsp.readdir(root)
    await assert.rejects(
      execFileAsync(
        process.execPath,
        [path.resolve(__dirname, '../dist/cli/index.js'), '--yes'],
        { cwd: root },
      ),
      (error) => {
        assert.match(error.stdout, /npm init playwright@latest/)
        assert.match(error.stdout, /npx qa-playwright/)
        return error.code === 1
      },
    )
    assert.deepEqual(await fsp.readdir(root), before)
  })
}

test('BDD CLI creates features and preserves the existing configuration', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'qa-bdd-'))
  t.after(() => fsp.rm(root, { recursive: true, force: true }))
  const pkg = JSON.stringify({
    devDependencies: { '@playwright/test': '^1.0.0' },
  })
  const config = 'export default { testDir: "./tests" }\n'
  await fsp.writeFile(path.join(root, 'package.json'), pkg)
  await fsp.writeFile(path.join(root, 'playwright.config.ts'), config)
  const bin = path.join(root, 'bin')
  await fsp.mkdir(bin)
  await fsp.writeFile(
    path.join(bin, 'npm'),
    `#!${process.execPath}
require('node:fs').appendFileSync('install.log', JSON.stringify(process.argv.slice(2)) + '\n')
process.exit(Number(process.env.BDD_INSTALL_EXIT || 0))
`.replace("+ '\n'", "+ '\\n'"),
    { mode: 0o755 },
  )
  const env = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
  }
  const cli = path.resolve(__dirname, '../dist/cli/index.js')
  await execFileAsync(
    process.execPath,
    [cli, '--yes', '--bdd', '--suites=ui,api,integration'],
    { cwd: root, env },
  )
  assert.deepEqual(
    JSON.parse(
      (await fsp.readFile(path.join(root, 'install.log'), 'utf8')).trim(),
    ),
    ['install', '--save-dev', 'playwright-bdd'],
  )
  await fsp.access(path.join(root, 'tests/features/ui/example.feature'))
  await fsp.access(path.join(root, 'tests/steps/api.steps.ts'))
  await fsp.access(path.join(root, 'playwright.bdd.config.ts'))
  await fsp.access(path.join(root, 'BDD.md'))
  assert.equal(
    await fsp.readFile(path.join(root, 'playwright.config.ts'), 'utf8'),
    config,
  )
  assert.equal(await fsp.readFile(path.join(root, 'package.json'), 'utf8'), pkg)
  const steps = path.join(root, 'tests/steps/ui.steps.ts')
  await fsp.writeFile(steps, '// user steps')
  await execFileAsync(process.execPath, [cli, '--yes', '--bdd'], {
    cwd: root,
    env,
  })
  await assert.rejects(
    execFileAsync(process.execPath, [cli, '--yes', '--bdd'], {
      cwd: root,
      env: { ...env, BDD_INSTALL_EXIT: '1' },
    }),
    (error) => {
      assert.match(error.stdout, /BDD dependency installation failed/)
      assert.doesNotMatch(error.stdout, /Playwright scaffold created/)
      return error.code === 1
    },
  )
  assert.equal(await fsp.readFile(steps, 'utf8'), '// user steps')
})
