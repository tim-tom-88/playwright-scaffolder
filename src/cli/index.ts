#!/usr/bin/env node

import * as repo from '../repo/index'
import * as prompts from './prompt'
import * as output from './styling'

import type {
  ArchitectureChoice,
  ScaffoldOptions,
  TestSuite,
} from '../types/project'

type CliOptions = Partial<ScaffoldOptions> & { yes: boolean }

export const parseArguments = (args: string[]): CliOptions => {
  const valueFor = (name: string) =>
    args.find((argument) => argument.startsWith(`--${name}=`))?.split('=')[1]
  const architecture = valueFor('architecture')
  const suites = valueFor('suites')
  const validArchitectures: ArchitectureChoice[] = [
    'page-objects',
    'page-objects-components',
    'none',
  ]
  const validSuites: TestSuite[] = ['ui', 'api', 'integration']

  if (
    architecture !== undefined &&
    !validArchitectures.includes(architecture as ArchitectureChoice)
  ) {
    throw new Error(`Unsupported architecture: ${architecture}`)
  }

  const testSuites = suites
    ?.split(',')
    .filter(Boolean)
    .map((suite) => {
      if (!validSuites.includes(suite as TestSuite))
        throw new Error(`Unsupported test suite: ${suite}`)
      return suite as TestSuite
    })

  return {
    yes: args.includes('--yes'),
    installPlaywright: args.includes('--install-playwright'),
    createPlaywrightConfig: args.includes('--create-config'),
    ...(architecture === undefined
      ? {}
      : { architecture: architecture as ArchitectureChoice }),
    ...(testSuites === undefined ? {} : { testSuites }),
  }
}

export const runCli = async (args = process.argv.slice(2)) => {
  const cliOptions = parseArguments(args)
  const repositoryRoot = repo.findPackageJson(process.cwd())

  output.title('PLAYWRIGHT SCAFFOLDER')
  output.italic('Opinionated Playwright project setup')
  if (!repositoryRoot) {
    output.error(
      `Project root: unable to determine (${output.value('package.json')} not found)`,
    )
    console.log(
      `  Initialise a new npm project with ${output.value('npm init')}.`,
    )
    return false
  }

  output.success(`Project root: ${output.value(repositoryRoot)}`)
  if (repo.findTsConfig(repositoryRoot)) {
    output.success(`TypeScript configuration: ${output.value('tsconfig.json')}`)
  } else {
    output.warning('TypeScript configuration: tsconfig.json not found')
  }

  const packageManager = repo.detectPackageManager(repositoryRoot)
  if (packageManager)
    output.success(`Package manager: ${output.value(packageManager)}`)
  else
    output.warning(
      'Package manager: unable to determine (no supported lockfile found)',
    )

  const playwrightSetup = repo.detectPlaywright(repositoryRoot)
  const projectRoot = playwrightSetup?.playwrightRoot ?? repositoryRoot
  let installPlaywright = cliOptions.installPlaywright ?? false
  let createPlaywrightConfig = cliOptions.createPlaywrightConfig ?? false

  if (playwrightSetup) {
    output.success(`Playwright project: ${output.value(projectRoot)}`)
    if (playwrightSetup.playwrightConfig) {
      createPlaywrightConfig = false
      output.success(
        `Playwright configuration: ${output.value(playwrightSetup.playwrightConfig)}`,
      )
    } else {
      output.warning(
        `Playwright configuration: ${output.value('@playwright/test')} is installed, but no supported config file was found`,
      )
      createPlaywrightConfig = cliOptions.yes
        ? true
        : await prompts.askCreatePlaywrightConfig()
    }
  } else {
    output.warning('Playwright project: @playwright/test not found')
    installPlaywright = cliOptions.yes
      ? cliOptions.installPlaywright === true
      : await prompts.askInstallPlaywright()
    createPlaywrightConfig = installPlaywright
  }

  const architecture =
    cliOptions.architecture ??
    (cliOptions.yes ? 'none' : await prompts.askArchitecture())
  const testSuites =
    cliOptions.testSuites ??
    (cliOptions.yes ? [] : await prompts.askTestSuites())
  const scaffoldOptions: ScaffoldOptions = {
    installPlaywright,
    createPlaywrightConfig,
    architecture,
    testSuites,
  }
  const plan = repo.buildFilePlan(scaffoldOptions)
  const shouldScaffold = cliOptions.yes
    ? true
    : await prompts.confirmScaffold(plan.directories)

  if (!shouldScaffold) {
    output.italic('Scaffolding cancelled', true)
    return false
  }

  repo.scaffoldProject(projectRoot, plan.directories)
  await repo.writePlannedFiles(projectRoot, plan)
  if (createPlaywrightConfig || playwrightSetup?.playwrightConfig) {
    await repo.generatePlaywrightConfig(projectRoot, scaffoldOptions)
  }
  await repo.updatePackageJson(projectRoot, scaffoldOptions)
  output.success('Playwright scaffold created', true)
  return true
}

if (require.main === module) {
  runCli().catch((error: unknown) => {
    output.error(error instanceof Error ? error.message : String(error), true)
    process.exitCode = 1
  })
}
