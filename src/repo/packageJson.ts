import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import type { ScaffoldOptions } from '../types/project'

type PackageJson = {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

const playwrightScripts = {
  test: 'playwright test',
  'test:ui': 'playwright test --ui',
  'test:headed': 'playwright test --headed',
}

export const updatePackageJson = async (
  projectRoot: string,
  scaffoldOptions: ScaffoldOptions,
) => {
  const packagePath = path.join(projectRoot, 'package.json')
  const packageJson = JSON.parse(
    await fs.readFile(packagePath, 'utf8'),
  ) as PackageJson

  packageJson.scripts = { ...playwrightScripts, ...packageJson.scripts }

  if (
    scaffoldOptions.installPlaywright &&
    !packageJson.dependencies?.['@playwright/test'] &&
    !packageJson.devDependencies?.['@playwright/test']
  ) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      '@playwright/test': 'latest',
    }
  }

  const temporaryPath = `${packagePath}.playwright-scaffolder.tmp`
  await fs.writeFile(temporaryPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  await fs.rename(temporaryPath, packagePath)
}
