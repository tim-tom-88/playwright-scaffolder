import * as repo from '../repo/index'
import * as prompts from './prompt'
import * as output from './styling'

import type {
  ArchitectureChoice,
  ScaffoldOptions,
  TestSuite,
} from '../types/project'

let installPlaywright = false
let createPlaywrightConfig = false
let architecture: ArchitectureChoice
let testSuites: TestSuite[]

const main = async () => {
  const currentDir = process.cwd()
  const projectRoot = repo.findPackageJson(currentDir)

  output.title('PLAYWRIGHT SCAFFOLDER')
  output.italic('Opinionated Playwright project setup')
  if (projectRoot) {
    output.success(`Project root: ${output.value(projectRoot)}`)

    if (repo.findTsConfig(projectRoot)) {
      output.success(
        `TypeScript configuration: ${output.value('tsconfig.json')}`,
      )
    } else {
      output.warning('TypeScript configuration: tsconfig.json not found')
    }

    const packageManager = repo.detectPackageManager(projectRoot)

    if (packageManager) {
      output.success(`Package manager: ${output.value(packageManager)}`)
    } else {
      output.warning(
        'Package manager: unable to determine (no supported lockfile found)',
      )
    }

    const playwrightSetup = repo.detectPlaywright(projectRoot)

    if (playwrightSetup) {
      output.success(
        `Playwright project: ${output.value(playwrightSetup.playwrightRoot)}`,
      )

      if (playwrightSetup.playwrightConfig) {
        output.success(
          `Playwright configuration: ${output.value(playwrightSetup.playwrightConfig)}`,
        )
        architecture = await prompts.askArchitecture()
        testSuites = await prompts.askTestSuites()
      } else {
        output.warning(
          `Playwright configuration: ${output.value('@playwright/test')} is installed, but no supported config file was found`,
        )
        createPlaywrightConfig = await prompts.askCreatePlaywrightConfig()
        architecture = await prompts.askArchitecture()
        testSuites = await prompts.askTestSuites()
      }
    } else {
      output.warning('Playwright project: @playwright/test not found')
      installPlaywright = await prompts.askInstallPlaywright()
      createPlaywrightConfig = installPlaywright
      architecture = await prompts.askArchitecture()
      testSuites = await prompts.askTestSuites()
    }
  } else {
    output.error(
      `Project root: unable to determine (${output.value('package.json')} not found)`,
    )
    console.log(
      `  Initialise a new npm project with ${output.value('npm init')}.`,
    )
    return
  }

  const scaffoldOptions: ScaffoldOptions = {
    installPlaywright,
    createPlaywrightConfig,
    architecture,
    testSuites,
  }
  const directories = repo.getDirectories(scaffoldOptions)

  if (await prompts.confirmScaffold(directories)) {
    repo.scaffoldProject(projectRoot, directories)
    output.success('Created scaffold structure', true)
  } else {
    output.italic('Scaffolding cancelled', true)
  }
}

main()
