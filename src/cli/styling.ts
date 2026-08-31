const styles = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  italic: '\x1b[3m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  blueBackground: '\x1b[44m',
}
export const title = (message: string) =>
  console.log(
    `${styles.bold}${styles.blueBackground}${styles.white}======= ${message} =======${styles.reset}\n`,
  )

export const italic = (message: string) =>
  console.log(`${styles.italic}${message}${styles.reset}\n`)

export const success = (message: string) =>
  console.log(`${styles.green}✓${styles.reset} ${message}`)

export const warning = (message: string) =>
  console.log(`${styles.yellow}!${styles.reset} ${message}`)

export const error = (message: string) =>
  console.log(`${styles.red}✗${styles.reset} ${message}`)

export const value = (text: string) =>
  `${styles.bold}${styles.cyan}${text}${styles.reset}`
