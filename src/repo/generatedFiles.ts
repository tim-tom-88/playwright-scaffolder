import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import type { ScaffoldPlan } from '../types/project'

export const writePlannedFiles = async (
  projectRoot: string,
  plan: ScaffoldPlan,
) => {
  for (const file of plan.files) {
    const destination = path.join(projectRoot, file.path)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    try {
      await fs.writeFile(destination, file.content, { flag: 'wx' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
}
