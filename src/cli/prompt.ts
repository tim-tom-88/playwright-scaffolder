import { confirm, select, checkbox } from '@inquirer/prompts'
import type { ArchitectureChoice, TestSuite } from '../types/project'

export const askInstallPlaywright = async (): Promise<boolean> => {
  return confirm({ message: 'Would you like to install Playwright?' })
}

export const askCreatePlaywrightConfig = async (): Promise<boolean> => {
  return confirm({
    message: 'Would you like to create a Playwright configuration file?',
  })
}

export const askArchitecture = async (): Promise<ArchitectureChoice> => {
  return select({
    message: 'Please select the setup type:',
    choices: [
      { name: 'Page Objects', value: 'page-objects' },
      { name: 'Page Objects + Components', value: 'page-objects-components' },
      { name: 'None', value: 'none' },
    ],
  })
}

export const askTestSuites = async (): Promise<TestSuite[]> => {
  return checkbox({
    message: 'Which test suites would you like to scaffold?',
    choices: [
      { name: 'UI', value: 'ui' },
      { name: 'API', value: 'api' },
      { name: 'Integration', value: 'integration' },
    ],
  })
}

export const directoryTree = (directories: string[]) => {
  console.log('\ntests')

  const children = directories.map((directory) =>
    directory.replace('tests/', ''),
  )

  children.forEach((child, index) => {
    const isLast = index === children.length - 1
    const branch = isLast ? '└──' : '├──'

    console.log(`${branch} ${child}`)
  })
  console.log('\n')
}

export const confirmScaffold = async (
  directories: string[],
): Promise<boolean> => {
  directoryTree(directories)
  return confirm({
    message: 'Create this structure?',
  })
}
