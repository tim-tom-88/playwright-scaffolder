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
  for (const argument of args) {
    if (
      !['--yes', '--bdd'].includes(argument) &&
      !argument.startsWith('--architecture=') &&
      !argument.startsWith('--suites=')
    ) {
      throw new Error(
        `Unsupported option: ${argument}. Initialise Playwright with npm init playwright@latest first.`,
      )
    }
  }
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
    ...(args.includes('--bdd') ? { bdd: true } : {}),
    ...(architecture === undefined
      ? {}
      : { architecture: architecture as ArchitectureChoice }),
    ...(testSuites === undefined ? {} : { testSuites }),
  }
}

export const runCli = async (args = process.argv.slice(2)) => {
  const cliOptions = parseArguments(args)
  const repositoryRoot = repo.findPackageJson(process.cwd())

  output.title('QA PLAYWRIGHT')
  output.italic('Opinionated structure for your existing Playwright project')
  if (!repositoryRoot) {
    output.error(
      `Project root: unable to determine (${output.value('package.json')} not found)`,
    )
    console.log(
      `  Initialise a new npm project with ${output.value('npm init playwright@latest')}, then run ${output.value('npx qa-playwright')} again.`,
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
  if (!playwrightSetup?.playwrightConfig) {
    output.warning(
      playwrightSetup
        ? 'Playwright configuration not found'
        : 'Playwright project: @playwright/test not found',
    )
    console.log(
      '  Run npm init playwright@latest first, then rerun npx qa-playwright.',
    )
    return false
  }
  output.success(`Playwright project: ${output.value(projectRoot)}`)
  output.success(
    `Playwright configuration: ${output.value(playwrightSetup.playwrightConfig)}`,
  )

  const testSuites =
    cliOptions.testSuites ??
    (cliOptions.yes ? ['ui'] : await prompts.askTestSuites())
  const architecture =
    cliOptions.architecture ??
    (cliOptions.yes ? 'page-objects' : await prompts.askArchitecture())
  const bdd =
    cliOptions.bdd ?? (cliOptions.yes ? false : await prompts.askBdd())
  const scaffoldOptions: ScaffoldOptions = { architecture, testSuites, bdd }
  const plan = repo.buildFilePlan(
    scaffoldOptions,
    playwrightSetup.playwrightConfig,
  )
  const shouldScaffold = cliOptions.yes
    ? true
    : await prompts.confirmScaffold(plan.directories)

  if (!shouldScaffold) {
    output.italic('Scaffolding cancelled', true)
    return false
  }

  if (bdd) {
    const bddPackageManager =
      repo.detectPackageManager(projectRoot) ?? packageManager ?? 'npm'
    output.italic(`Installing playwright-bdd with ${bddPackageManager}...`)
    await repo.installBdd(projectRoot, bddPackageManager)
  }
  repo.scaffoldProject(projectRoot, plan.directories)
  await repo.writePlannedFiles(projectRoot, plan)
  output.success('Playwright scaffold created', true)
  if (bdd)
    output.italic(
      'BDD ready: playwright-bdd installed and playwright.bdd.config.ts created (existing files preserved). See BDD.md for generation and run commands.',
    )
  output.italic(
    'Examples are in tests/. If your config uses a custom testDir or testMatch, include these directories before running them.',
  )
  return true
}

if (require.main === module) {
  runCli()
    .then((completed) => {
      if (!completed) process.exitCode = 1
    })
    .catch((error: unknown) => {
      output.error(error instanceof Error ? error.message : String(error), true)
      process.exitCode = 1
    })
}
