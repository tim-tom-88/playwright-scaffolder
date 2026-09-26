import type {
  PlannedFile,
  ScaffoldOptions,
  ScaffoldPlan,
} from '../types/project'
import { getDirectories } from './scaffoldProject'

const pageObject = `import type { Page } from '@playwright/test'

export class ExamplePage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/')
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

const helper = `export const uniqueTestName = (prefix = 'test') =>
  \`${'${prefix}'}-${'${Date.now()}'}\`
`

const fixture = `import { test as base } from '@playwright/test'
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
): ScaffoldPlan => {
  const files: PlannedFile[] = []

  if (scaffoldOptions.testSuites.length > 0) {
    files.push({ path: 'tests/helpers/example.helper.ts', content: helper })
  }
  if (scaffoldOptions.architecture !== 'none') {
    files.push({ path: 'tests/pages/example.page.ts', content: pageObject })
    files.push({ path: 'tests/fixtures/test.ts', content: fixture })
  }
  if (scaffoldOptions.architecture === 'page-objects-components') {
    files.push({
      path: 'tests/components/example.component.ts',
      content: component,
    })
  }

  const fileDirectories = files.map(({ path }) =>
    path.slice(0, path.lastIndexOf('/')),
  )

  return {
    directories: [
      ...new Set([...getDirectories(scaffoldOptions), ...fileDirectories]),
    ],
    files,
  }
}
