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
    JSON.stringify({ name: 'fixture' }),
  )

  const cli = path.resolve(__dirname, '../dist/cli/index.js')
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      cli,
      '--yes',
      '--install-playwright',
      '--architecture=page-objects-components',
      '--suites=ui,api',
    ],
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
  assert.match(config, /name: 'ui'/)
  assert.match(config, /name: 'api'/)
})
