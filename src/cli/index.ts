import * as repo from '../repo/inspectProject'

import * as prompts from './prompt'

import type {
  ArchitectureChoice,
  ScaffoldOptions,
  TestSuite,
} from '../types/project'

const styles = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
}

const success = (message: string) =>
  console.log(`${styles.green}✓${styles.reset} ${message}`)

const warning = (message: string) =>
  console.log(`${styles.yellow}!${styles.reset} ${message}`)

const error = (message: string) =>
  console.log(`${styles.red}✗${styles.reset} ${message}`)

const value = (text: string) =>
  `${styles.bold}${styles.cyan}${text}${styles.reset}`

let installPlaywright = false
let createPlaywrightConfig = false
let architecture: ArchitectureChoice
let testSuites: TestSuite[]

const main = async () => {
  const currentDir = process.cwd()
  const projectRoot = repo.findPackageJson(currentDir)

  if (projectRoot) {
    success(`Project root: ${value(projectRoot)}`)

    if (repo.findTsConfig(projectRoot)) {
      success(`TypeScript configuration: ${value('tsconfig.json')}`)
    } else {
      warning('TypeScript configuration: tsconfig.json not found')
    }

    const packageManager = repo.detectPackageManager(projectRoot)

    if (packageManager) {
      success(`Package manager: ${value(packageManager)}`)
    } else {
      warning(
        'Package manager: unable to determine (no supported lockfile found)',
      )
    }

    const playwrightSetup = repo.detectPlaywright(projectRoot)

    if (playwrightSetup) {
      success(`Playwright project: ${value(playwrightSetup.playwrightRoot)}`)

      if (playwrightSetup.playwrightConfig) {
        success(
          `Playwright configuration: ${value(playwrightSetup.playwrightConfig)}`,
        )
        architecture = await prompts.askArchitecture()
        testSuites = await prompts.askTestSuites()
      } else {
        warning(
          `Playwright configuration: ${value('@playwright/test')} is installed, but no supported config file was found`,
        )
        createPlaywrightConfig = await prompts.askCreatePlaywrightConfig()
        architecture = await prompts.askArchitecture()
        testSuites = await prompts.askTestSuites()
      }
    } else {
      warning('Playwright project: @playwright/test not found')
      installPlaywright = await prompts.askInstallPlaywright()
      createPlaywrightConfig = installPlaywright
      architecture = await prompts.askArchitecture()
      testSuites = await prompts.askTestSuites()
    }
  } else {
    error(
      `Project root: unable to determine (${value('package.json')} not found)`,
    )
    console.log(`  Initialise a new npm project with ${value('npm init')}.`)
  }
  const scaffoldOptions: ScaffoldOptions = {
    installPlaywright,
    createPlaywrightConfig,
    architecture,
    testSuites,
  }
  console.log(scaffoldOptions)
}

main()
