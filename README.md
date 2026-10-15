# QA Playwright

An opinionated second-stage scaffolder for existing Playwright projects. Let Playwright handle installation, browsers, configuration, and CI; then add test structure and architecture examples with QA Playwright.

## Usage

Requires Node.js 20 or newer. From your project directory:

```sh
npm init playwright@latest
npx qa-playwright
```

The package must be published before the `npx` command is available from npm. To try this checkout, run `npm run build`, then run `node /absolute/path/to/playwright-scaffolder/dist/cli/index.js` from your initialized project.

The CLI checks for `@playwright/test` and a Playwright config. If either is missing, it tells you to run `npm init playwright@latest`, then rerun `npx qa-playwright`. Standard mode does not install dependencies or create configuration. BDD mode installs `playwright-bdd` and adds a separate BDD config.

Setup asks, in order:

1. Which directories to create under `tests/`: UI, API, and/or integration.
2. Which architecture to use: page objects, page objects with components, or plain specs.
3. Whether to use BDD with Gherkin features and `playwright-bdd`.
4. Whether to create the displayed structure and examples.

For non-interactive use:

```sh
npx qa-playwright --yes --architecture=page-objects-components --suites=ui,api,integration
```

| Flag             | Values                                            | Purpose                                              |
| ---------------- | ------------------------------------------------- | ---------------------------------------------------- |
| `--yes`          | —                                                 | Skip prompts; defaults to UI tests with page objects |
| `--architecture` | `page-objects`, `page-objects-components`, `none` | Select example architecture                          |
| `--suites`       | comma-separated `ui`, `api`, `integration`        | Select test directories and example specs            |

The former `--install-playwright` and `--create-config` flags are no longer supported. Use Playwright init first.

## Generated structure

Selecting all suites with page objects and components creates:

```text
tests/
├── api/
│   └── example.spec.ts
├── components/
│   └── example.component.ts
├── fixtures/
│   └── test.ts
├── helpers/
│   └── example.helper.ts
├── integration/
│   └── example.spec.ts
├── pages/
│   └── example.page.ts
└── ui/
    └── example.spec.ts
```

The UI spec uses the typed page-object fixture and, when selected, checks the reusable component. Plain specs import Playwright directly. UI examples use local markup; the integration example demonstrates UI/API interaction with mocked responses. The API example skips until you set `QA_API_URL` to your application's health endpoint.

Run your tests with `npx playwright test` after scaffolding. Replace the example content with your application's pages, selectors, and assertions.

## Existing projects

Existing files are never overwritten. Playwright config, browser projects, package scripts, and original starter tests are preserved. BDD mode adds `playwright-bdd` as a dev dependency and updates the package manager lockfile. Suites are directories, not additional Playwright projects.

Generated files are TypeScript and use lowercase `tests/`. If your configuration uses a different `testDir`, custom `testMatch`, or exclusions, adjust it to discover the generated specs. Existing browser projects determine which suites run in each browser; configure separate API projects yourself if needed.

The CLI detects `.ts`, `.js`, `.mts`, `.mjs`, `.cts`, and `.cjs` Playwright config files. It can find nested Playwright packages; in a monorepo with multiple test packages, run it inside the intended package.

## Development

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Tests cover detection, file plans, generated TypeScript imports, prerequisite failures without filesystem changes, config preservation, and reruns that preserve user edits.

## Release

`npm publish` runs the test suite through `prepublishOnly`. The package includes `dist`, this README, and the license. Confirm that `qa-playwright` is available on npm and authenticate with the intended npm account before publishing.

## BDD support

Opt in interactively or use:

```sh
npx qa-playwright --yes --bdd --suites=ui,api,integration
npx bddgen --config playwright.bdd.config.ts
npx playwright test --config playwright.bdd.config.ts
```

`--bdd` replaces example specs with Gherkin scenarios in `tests/features/<suite>/` and matching TypeScript steps in `tests/steps/`. Page objects and components remain available through BDD fixtures. Each starter scenario has one outcome step; expand it with Given/When steps for your application's behavior.

A separate `playwright.bdd.config.ts` inherits the detected Playwright config and browser projects, with BDD discovery settings. Review inherited project dependencies and custom filters for your setup. Generated `BDD.md` includes setup commands. Add `.features-gen/` to your project's `.gitignore` and regenerate after editing features or steps. BDD setup automatically installs `playwright-bdd` as a dev dependency using the Playwright package’s detected package manager, falling back to the repository package manager or npm. Installation failures stop scaffolding and report a retry command. Existing files are preserved, so review fixtures and config when enabling BDD in an already scaffolded project.
