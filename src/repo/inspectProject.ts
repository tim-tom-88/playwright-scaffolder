import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 *
 * @param searchDirectory
 * @returns searchDirectory if package.json found or null if searched up to root and not found
 *
 */
export const findPackageJson = (searchDirectory: string): string | null => {
  if (fs.existsSync(path.join(searchDirectory, 'package.json'))) {
    return searchDirectory
  } else {
    const parentDir = path.dirname(searchDirectory)
    if (parentDir !== searchDirectory) {
      return findPackageJson(parentDir)
    } else {
      return null
    }
  }
}

export const findTsConfig = (projectRoot: string): boolean => {
  return fs.existsSync(path.join(projectRoot, 'tsconfig.json'))
}

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

const packageManagers: Array<{
  manager: PackageManager
  lockfiles: string[]
}> = [
  { manager: 'npm', lockfiles: ['package-lock.json'] },
  { manager: 'yarn', lockfiles: ['yarn.lock'] },
  { manager: 'pnpm', lockfiles: ['pnpm-lock.yaml'] },
  { manager: 'bun', lockfiles: ['bun.lock', 'bun.lockb'] },
]

export const detectPackageManager = (
  projectRoot: string,
): PackageManager | undefined => {
  return packageManagers.find(({ lockfiles }) =>
    lockfiles.some((lockfile) =>
      fs.existsSync(path.join(projectRoot, lockfile)),
    ),
  )?.manager
}

export type PlaywrightSetup = {
  playwrightRoot: string
  playwrightConfig: string | undefined
}

const playwrightConfigFiles = ['playwright.config.ts', 'playwright.config.js']

export const detectPlaywright = (
  projectRoot: string,
): PlaywrightSetup | null => {
  const packageJsonPath = path.join(projectRoot, 'package.json')

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf8'),
    ) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    if (
      packageJson.dependencies?.['@playwright/test'] !== undefined ||
      packageJson.devDependencies?.['@playwright/test'] !== undefined
    ) {
      const playwrightConfig = playwrightConfigFiles.find((configFile) =>
        fs.existsSync(path.join(projectRoot, configFile)),
      )

      return {
        playwrightRoot: projectRoot,
        playwrightConfig,
      }
    }
  }

  const ignoredDirectories = new Set(['.git', 'node_modules'])
  const childDirectories = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name),
    )
    .sort((left, right) => left.name.localeCompare(right.name))

  for (const childDirectory of childDirectories) {
    const playwrightSetup = detectPlaywright(
      path.join(projectRoot, childDirectory.name),
    )

    if (playwrightSetup) {
      return playwrightSetup
    }
  }

  return null
}
