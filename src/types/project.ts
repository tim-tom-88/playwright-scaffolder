export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export type PlaywrightSetup = {
  playwrightRoot: string
  playwrightConfig: string | undefined
}

export type ArchitectureChoice =
  'page-objects' | 'page-objects-components' | 'none'

export type TestSuite = 'ui' | 'api' | 'integration'

export type ScaffoldOptions = {
  installPlaywright: boolean
  createPlaywrightConfig: boolean
  architecture: ArchitectureChoice
  testSuites: TestSuite[]
}
