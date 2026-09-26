# Playwright Scaffolder

An opinionated CLI that adds a maintainable test structure to a new or existing Playwright project. It detects the repository and package manager, preserves existing configuration where possible, and creates only the examples selected during setup.

## Requirements

- Node.js 20 or newer
- A project containing a `package.json`

## Usage

Install and run the package from the directory you want to scaffold:

```sh
npx playwright-scaffolder
```

The interactive CLI can:

- detect npm, Yarn, pnpm, or Bun from its lockfile;
- find an existing Playwright project, including one nested in a monorepo;
- add UI, API, and integration test projects;
- create page objects and optional reusable components;
- create a typed fixture and helper example;
- add missing Playwright scripts and, when requested, `@playwright/test` to `package.json`.

For CI or scripted use, pass all choices non-interactively:

```sh
npx playwright-scaffolder \
  --yes \
  --install-playwright \
  --architecture=page-objects-components \
  --suites=ui,api,integration
```

Supported flags:

| Flag                   | Values                                            | Purpose                                            |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------- |
| `--yes`                | —                                                 | Skip confirmation and use non-interactive defaults |
| `--install-playwright` | —                                                 | Add `@playwright/test` when it is missing          |
| `--create-config`      | —                                                 | Create `playwright.config.ts`                      |
| `--architecture`       | `page-objects`, `page-objects-components`, `none` | Select generated architecture examples             |
| `--suites`             | comma-separated `ui`, `api`, `integration`        | Select Playwright projects and test directories    |

## Example output

Selecting page objects, components, and all suites creates:

```text
tests/
├── api/
├── components/
│   └── example.component.ts
├── fixtures/
│   └── test.ts
├── helpers/
│   └── example.helper.ts
├── integration/
├── pages/
│   └── example.page.ts
└── ui/
```

The generated fixture imports the generated page object, so the examples are immediately consistent with the selected architecture. Existing example files are not overwritten.

## Existing projects

When `playwright.config.ts` or `playwright.config.js` already uses `defineConfig`, the CLI keeps the existing text and inserts only missing suite projects. Existing scripts and dependencies in `package.json` take precedence over the CLI defaults.

## Limitations

- Automatic config merging requires a conventional `defineConfig({ ... })` call. Unconventional or computed configurations are rejected instead of being overwritten.
- The CLI updates dependencies but does not run a package-manager install or download Playwright browsers.
- JavaScript and TypeScript Playwright config files are supported; other config extensions are not currently detected.
- Generated examples are starting points and intentionally contain no application-specific selectors or URLs.

## Development

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

The test suite includes unit coverage for detection, config generation, package merging and file plans; an integration scaffold; and an end-to-end invocation of the built CLI.

## Release

`npm publish` runs the complete test suite through `prepublishOnly`. The published package contains `dist`, this README, and the license. Before the first public release, confirm the package name is available on npm and authenticate with the intended npm account.
