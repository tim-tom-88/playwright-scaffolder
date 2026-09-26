import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import type { ScaffoldOptions } from '../types/project'

const projectEntries = (scaffoldOptions: ScaffoldOptions) =>
  scaffoldOptions.testSuites.map(
    (suite) => `    {
      name: '${suite}',
      testDir: './tests/${suite}',
    },`,
  )

const createPlaywrightConfig = async (
  configPath: string,
  scaffoldOptions: ScaffoldOptions,
) => {
  const projects = projectEntries(scaffoldOptions).join('\n')

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
  const fileData = await fs.readFile(configPath, 'utf8')
  const missingProjects = scaffoldOptions.testSuites.filter(
    (suite) => !new RegExp(`name\\s*:\\s*['\"]${suite}['\"]`).test(fileData),
  )

  if (missingProjects.length === 0) return

  const entries = projectEntries({
    ...scaffoldOptions,
    testSuites: missingProjects,
  }).join('\n')
  const projectsMatch = /projects\s*:\s*\[/.exec(fileData)
  let updated: string

  if (projectsMatch) {
    const arrayStart = projectsMatch.index + projectsMatch[0].length
    updated = `${fileData.slice(0, arrayStart)}\n${entries}${fileData.slice(arrayStart)}`
  } else {
    const configStart = fileData.search(/defineConfig\s*\(\s*\{/)
    if (configStart === -1) {
      throw new Error(
        `Unable to safely update ${configPath}: defineConfig({ ... }) was not found`,
      )
    }
    const objectStart = fileData.indexOf('{', configStart)
    updated = `${fileData.slice(0, objectStart + 1)}\n  projects: [\n${entries}\n  ],${fileData.slice(objectStart + 1)}`
  }

  await fs.writeFile(configPath, updated)
}

export const generatePlaywrightConfig = async (
  projectRoot: string,
  scaffoldOptions: ScaffoldOptions,
) => {
  const candidates = ['playwright.config.ts', 'playwright.config.js']
  const existingConfig = (
    await Promise.all(
      candidates.map(async (name) => {
        try {
          await fs.access(path.join(projectRoot, name))
          return name
        } catch {
          return undefined
        }
      }),
    )
  ).find(Boolean)
  const configPath = path.join(
    projectRoot,
    existingConfig ?? 'playwright.config.ts',
  )

  if (scaffoldOptions.createPlaywrightConfig) {
    await createPlaywrightConfig(configPath, scaffoldOptions)
  } else {
    await updatePlaywrightConfig(configPath, scaffoldOptions)
  }
}
