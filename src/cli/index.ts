import { findPackageJson, findTsConfig, detectPackageManager } from '../repo/inspectProject'

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

const currentDir = process.cwd()
const projectRoot = findPackageJson(currentDir)

if (projectRoot) {
    success(`Project root: ${value(projectRoot)}`)

    if (findTsConfig(projectRoot)) {
        success(`TypeScript configuration: ${value('tsconfig.json')}`)
    } else {
        warning('TypeScript configuration: tsconfig.json not found')
    }

    const packageManager = detectPackageManager(projectRoot)

    if (packageManager) {
        success(`Package manager: ${value(packageManager)}`)
    } else {
        warning('Package manager: unable to determine (no supported lockfile found)')
    }
} else {
    error(`Project root: unable to determine (${value('package.json')} not found)`)
    console.log(`  Initialise a new npm project with ${value('npm init')}.`)
}
