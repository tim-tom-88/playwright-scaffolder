import * as fs from 'node:fs'
import * as path from 'node:path'

import type {
  ArchitectureChoice,
  ScaffoldOptions,
  TestSuite,
} from '../types/project'

const testSuiteDirectories: Record<TestSuite, string> = {
  ui: 'tests/ui',
  api: 'tests/api',
  integration: 'tests/integration',
}

const architectureDirectories: Record<ArchitectureChoice, string[]> = {
  'page-objects': ['tests/pages'],
  'page-objects-components': ['tests/pages', 'tests/components'],
  none: [],
}

export const getDirectories = (scaffoldOptions: ScaffoldOptions): string[] => {
  const testDirectories = scaffoldOptions.testSuites.map(
    (suite) => testSuiteDirectories[suite],
  )
  const architectureDirs = architectureDirectories[scaffoldOptions.architecture]

  return [...new Set([...testDirectories, ...architectureDirs])]
}

export const scaffoldProject = (
  projectRoot: string,
  directories: string[],
): void => {
  for (const directory of directories) {
    fs.mkdirSync(path.join(projectRoot, directory), { recursive: true })
  }
}
