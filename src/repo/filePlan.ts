import type {
  PlannedFile,
  ScaffoldOptions,
  ScaffoldPlan,
} from '../types/project'
import { getDirectories } from './scaffoldProject'

const pageObject = (
  withComponents: boolean,
) => `import type { Page } from '@playwright/test'
${withComponents ? "import { ExampleComponent } from '../components/example.component'\n" : ''}
export class ExamplePage {
  ${withComponents ? 'readonly component: ExampleComponent' : ''}
  constructor(private readonly page: Page) {${withComponents ? '\n    this.component = new ExampleComponent(page)\n  ' : ''}}

  async open() {
    await this.page.setContent('<main data-testid="example-component"><h1>Example app</h1></main>')
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Example app' })
  }
}
`

const component = `import type { Locator, Page } from '@playwright/test'

export class ExampleComponent {
  readonly root: Locator

  constructor(page: Page) {
    this.root = page.getByTestId('example-component')
  }
}
`

const uiSpec = (architecture: ScaffoldOptions['architecture']) =>
  architecture === 'none'
    ? `import { test, expect } from '@playwright/test'

test('renders the example app', async ({ page }) => {
  await page.setContent('<h1>Example app</h1>')
  await expect(page.getByRole('heading', { name: 'Example app' })).toBeVisible()
})
`
    : `import { test, expect } from '../fixtures/test'

test('renders the example app', async ({ examplePage }) => {
  await examplePage.open()
  await expect(examplePage.heading).toBeVisible()
${architecture === 'page-objects-components' ? '  await expect(examplePage.component.root).toBeVisible()\n' : ''}})
`

const apiSpec = `import { test, expect } from '@playwright/test'

// Set QA_API_URL to your application's health endpoint to run this example.
test('health endpoint responds successfully', async ({ request }) => {
  const endpoint = process.env.QA_API_URL
  test.skip(!endpoint, 'Set QA_API_URL to run against your API')
  const response = await request.get(endpoint!)
  expect(response.ok()).toBeTruthy()
})
`

const integrationSpec = `import { test, expect } from '@playwright/test'

test('renders data from an API response', async ({ page }) => {
  // Reserved example domain: both responses are mocked, no server is needed.
  await page.route('https://qa.example/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/api/message') {
      await route.fulfill({ json: { message: 'Hello from the API' } })
    } else {
      await route.fulfill({ contentType: 'text/html', body: \`<h1>Loading</h1>
        <script>fetch('/api/message').then(r => r.json()).then(data => {
          document.querySelector('h1').textContent = data.message
        })</script>\` })
    }
  })
  await page.goto('https://qa.example/')
  await expect(page.getByRole('heading')).toHaveText('Hello from the API')
})
`

const helper = `export const uniqueTestName = (prefix = 'test') =>
  \`${'${prefix}'}-${'${Date.now()}'}\`
`

const fixture = (
  bdd = false,
) => `import { test as base } from '${bdd ? 'playwright-bdd' : '@playwright/test'}'
import { ExamplePage } from '../pages/example.page'

type Fixtures = { examplePage: ExamplePage }

export const test = base.extend<Fixtures>({
  examplePage: async ({ page }, use) => {
    await use(new ExamplePage(page))
  },
})

export { expect } from '@playwright/test'
`

export const buildFilePlan = (
  scaffoldOptions: ScaffoldOptions,
  playwrightConfig = 'playwright.config.ts',
): ScaffoldPlan => {
  const files: PlannedFile[] = []

  if (scaffoldOptions.testSuites.length > 0) {
    files.push({ path: 'tests/helpers/example.helper.ts', content: helper })
  }
  if (scaffoldOptions.architecture !== 'none') {
    files.push({
      path: 'tests/pages/example.page.ts',
      content: pageObject(
        scaffoldOptions.architecture === 'page-objects-components',
      ),
    })
    files.push({
      path: 'tests/fixtures/test.ts',
      content: fixture(scaffoldOptions.bdd),
    })
  }
  if (scaffoldOptions.architecture === 'page-objects-components') {
    files.push({
      path: 'tests/components/example.component.ts',
      content: component,
    })
  }

  const specs = {
    ui: uiSpec(scaffoldOptions.architecture),
    api: apiSpec,
    integration: integrationSpec,
  }
  if (scaffoldOptions.bdd) {
    files.push(
      {
        path: 'playwright.bdd.config.ts',
        content: `import { defineConfig } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'
import baseConfig from './${playwrightConfig.replace(/\.(ts|mts|cts)$/, '')}'

const testDir = defineBddConfig({
  features: 'tests/features/**/*.feature',
  steps: ['tests/steps/**/*.ts', 'tests/fixtures/test.ts'],
  outputDir: '.features-gen',
})

export default defineConfig({
  ...baseConfig,
  testDir,
  testMatch: '**/*.spec.js',
  testIgnore: [],
  projects: baseConfig.projects?.map(project => ({
    ...project, testDir, testMatch: '**/*.spec.js', testIgnore: [],
  })),
})
`,
      },
      {
        path: 'BDD.md',
        content: `# BDD tests

playwright-bdd is installed automatically during scaffolding. Generate and run your BDD tests:

\`\`\`sh
npx bddgen --config playwright.bdd.config.ts
npx playwright test --config playwright.bdd.config.ts
\`\`\`

Regenerate after changing features or steps. Add .features-gen/ to your .gitignore.
Features live in tests/features/ and step definitions in tests/steps/.
The API example skips until QA_API_URL points to your health endpoint.
The BDD config inherits your existing configuration and browser projects.
Review project dependencies and custom test filters before running it.
Existing files are preserved; on reruns, review any previously generated fixtures/config.
`,
      },
    )
  }
  for (const suite of new Set(scaffoldOptions.testSuites)) {
    if (scaffoldOptions.bdd) {
      const titles = {
        ui: 'renders the example app',
        api: 'health endpoint responds successfully',
        integration: 'renders data from an API response',
      }
      const usesFixture = scaffoldOptions.architecture !== 'none'
      const spec = specs[suite]
        .replace(
          /import \{ test, expect \} from '[^']+'/,
          `import { expect } from '@playwright/test'
import { createBdd${usesFixture ? '' : ', test'} } from 'playwright-bdd'
${usesFixture ? "import { test } from '../fixtures/test'\n" : ''}
const { Then } = createBdd(test)`,
        )
        .replace("test('", "Then('")
      files.push(
        {
          path: `tests/features/${suite}/example.feature`,
          content: `Feature: Example ${suite} behavior

  Scenario: ${titles[suite]}
    Then ${titles[suite]}
`,
        },
        { path: `tests/steps/${suite}.steps.ts`, content: spec },
      )
      continue
    }
    files.push({
      path: `tests/${suite}/example.spec.ts`,
      content: specs[suite],
    })
  }

  const fileDirectories = files
    .filter(({ path }) => path.includes('/'))
    .map(({ path }) => path.slice(0, path.lastIndexOf('/')))

  return {
    directories: [
      ...new Set([...getDirectories(scaffoldOptions), ...fileDirectories]),
    ],
    files,
  }
}
