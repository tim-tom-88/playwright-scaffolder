import { confirm, select, checkbox } from '@inquirer/prompts'
import * as output from './styling'
import type { ArchitectureChoice, TestSuite } from '../types/project'

export const askArchitecture = async (): Promise<ArchitectureChoice> => {
  return select({
    message: 'Which architecture would you like for your examples?',
    choices: [
      { name: 'Page Objects', value: 'page-objects' },
      { name: 'Page Objects + Components', value: 'page-objects-components' },
      { name: 'None', value: 'none' },
    ],
  })
}

export const askTestSuites = async (): Promise<TestSuite[]> => {
  return checkbox({
    message: 'Which directories would you like under tests/?',
    choices: [
      { name: 'UI (tests/ui)', value: 'ui', checked: true },
      { name: 'API (tests/api)', value: 'api' },
      { name: 'Integration (tests/integration)', value: 'integration' },
    ],
  })
}

export const confirmScaffold = async (
  directories: string[],
): Promise<boolean> => {
  output.directoryTree(directories)
  return confirm({
    message: 'Create this structure?',
  })
}

export const askBdd = async (): Promise<boolean> =>
  confirm({
    message: 'Use BDD (Gherkin features with playwright-bdd)?',
    default: false,
  })
