import * as fs from 'node:fs'
import * as path from 'node:path'
import type { PackageManager, PlaywrightSetup } from '../types/project'

/**
 * Searches this directory and its ancestors for a package.json.
 *
 * @param searchDirectory - Directory from which to begin searching.
 * @returns The directory containing package.json, or null if none is found.
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

/**
 * Checks whether the project root contains a TypeScript configuration.
 *
 * @param projectRoot - Root directory of the project.
 * @returns Whether tsconfig.json exists in the project root.
 */
export const findTsConfig = (projectRoot: string): boolean => {
  return fs.existsSync(path.join(projectRoot, 'tsconfig.json'))
}

const packageManagers: Array<{
  manager: PackageManager
  lockfiles: string[]
}> = [
  { manager: 'npm', lockfiles: ['package-lock.json'] },
  { manager: 'yarn', lockfiles: ['yarn.lock'] },
  { manager: 'pnpm', lockfiles: ['pnpm-lock.yaml'] },
  { manager: 'bun', lockfiles: ['bun.lock', 'bun.lockb'] },
]

/**
 * Determines the project's package manager from its lockfile.
 *
 * @param projectRoot - Root directory of the project.
 * @returns The detected package manager, or undefined if no supported lockfile exists.
 */
export const detectPackageManager = (
  projectRoot: string,
): PackageManager | undefined => {
  return packageManagers.find(({ lockfiles }) =>
    lockfiles.some((lockfile) =>
      fs.existsSync(path.join(projectRoot, lockfile)),
    ),
  )?.manager
}

const playwrightConfigFiles = ['playwright.config.ts', 'playwright.config.js']

/**
 * Recursively searches for a project that declares @playwright/test.
 *
 * @param projectRoot - Directory from which to begin searching.
 * @returns The Playwright root and optional config filename, or null if Playwright is not found.
 * @throws If a discovered package.json cannot be read or parsed.
 */
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
