import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import type { ScaffoldOptions } from '../types/project'

const createPlaywrightConfig = async (
  configPath: string,
  scaffoldOptions: ScaffoldOptions,
) => {
  const projects = scaffoldOptions.testSuites
    .map(
      (suite) => `    {
      name: '${suite}',
      testDir: './tests/${suite}',
    },`,
    )
    .join('\n')

  const fileData = `import { defineConfig } from '@playwright/test'

export default defineConfig({
  projects: [
${projects}
  ],
})
`

  await fs.writeFile(configPath, fileData)
}

const updatePlaywrightConfig = async (
  configPath: string,
  scaffoldOptions: ScaffoldOptions,
) => {
  return true
}

export const generatePlaywrightConfig = async (
  projectRoot: string,
  scaffoldOptions: ScaffoldOptions,
) => {
  const configPath = path.join(projectRoot, 'playwright.config.ts')

  if (scaffoldOptions.createPlaywrightConfig) {
    await createPlaywrightConfig(configPath, scaffoldOptions)
  } else {
    await updatePlaywrightConfig(projectRoot, scaffoldOptions)
  }
}
