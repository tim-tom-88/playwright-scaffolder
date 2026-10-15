import * as childProcess from 'node:child_process'
import type { PackageManager } from '../types/project'

export const installBdd = (
  projectRoot: string,
  packageManager: PackageManager,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const args =
      packageManager === 'npm'
        ? ['install', '--save-dev', 'playwright-bdd']
        : ['add', '--dev', 'playwright-bdd']
    const command = `${packageManager} ${args.join(' ')}`
    const child = childProcess.spawn(packageManager, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.once('error', (error) =>
      reject(
        new Error(
          `BDD dependency installation failed: ${error.message}. Retry ${command} in ${projectRoot}.`,
        ),
      ),
    )
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            `BDD dependency installation failed (${signal ?? code}). Retry ${command} in ${projectRoot}.`,
          ),
        )
    })
  })
