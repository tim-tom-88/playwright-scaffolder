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
