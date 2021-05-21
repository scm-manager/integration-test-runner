<p align="center">
  <a href="https://www.scm-manager.org/">
    <img alt="SCM-Manager" src="https://download.scm-manager.org/images/logo/scm-manager_logo.png" width="500" />
  </a>
</p>
<h1 align="center">
  @scm-manager/integration-test-runner
</h1>

The integration test runner is a command line tool for developing and running integrated end-to-end tests for the scm-manager.
It also serves as a library for common testing scenarios.

# Installation

Install the `@scm-manager/integration-test-runner` as dev dependency:

```bash
yarn add --dev @scm-manager/integration-test-runner
# or 
npm install --save-dev @scm-manager/integration-test-runner
```

Initialize a plugin for the development of behaviour-driven e2e tests:

```bash
node_modules/.bin/integration-test-runner init
```

# Usage

In addition to setting up the folder structure under `src/test/e2e` and creating a test example, the `init` command creates a new `e2e` script entry in the plugin's `package.json`.

You can execute it directly for local testing, but the build pipeline will also run this for verification:

```bash
yarn run e2e
```

> *Hint*: The `collect` and `provision` commands are only used internally and not relevant to plugin development.

For further information on how to write the tests please read [this guide](https://github.com/TheBrainFamily/cypress-cucumber-preprocessor#how-to-write-tests) and for best-practices please refer to [this article](https://automationpanda.com/2017/01/30/bdd-101-writing-good-gherkin/).
