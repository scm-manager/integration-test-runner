const { writeJson, readJsonSync, ensureDir, copy } = require("fs-extra");
const { join } = require("path");

const PLUGIN_NAME_REGEX = /@scm-manager\/(scm-.+-plugin)/g;

const CWD = process.cwd();
const CODE_GENERATION_DIRECTORY = join(
  __dirname,
  "..",
  "src",
  "code_generation"
);

exports.command = "init";
exports.describe =
  "Initializes an scm-manager plugin for using behaviour-driven-development (BDD) e2e testing.";
exports.handler = async argv => {
  // Update package.json
  const packagePath = join(CWD, "package.json");
  const packageContent = readJsonSync(packagePath);
  const pluginNameMatch = PLUGIN_NAME_REGEX.exec(packageContent.name);
  if (!pluginNameMatch) {
    throw new Error(
      "Package name does not match plugin pattern ('@scm-manager/scm-mypluginname-plugin')"
    );
  }
  const pluginName = pluginNameMatch[1];
  if (!packageContent.scripts) {
    packageContent.scripts = {};
  }
  packageContent.scripts.e2e =
    "integration-test-runner run -u scmadmin -p scmadmin -O ../../../build/target/ -d ./src/test/e2e";
  await writeJson(packagePath, packageContent, { spaces: 2 });
  // Create folder structure
  const e2eTestDir = join(CWD, "src", "test", "e2e");
  const cypressDir = join(e2eTestDir, "cypress");
  const pluginsDirectory = join(cypressDir, "plugins");
  const integrationDirectory = join(cypressDir, "integration");
  const fixturesDirectory = join(cypressDir, "fixtures");
  const supportDirectory = join(cypressDir, "support");
  const commandsDirectory = join(supportDirectory, "commands");
  const stepDefinitionsDirectory = join(supportDirectory, "step_definitions");

  // Create folder structure and generate code
  // Parallelize whatever possible
  await ensureDir(cypressDir);
  await Promise.all([
    writeJson(join(e2eTestDir, "cypress.json"), {}),
    ensureDir(integrationDirectory).then(() => copy(join(CODE_GENERATION_DIRECTORY, "featureExample.feature"),
        join(integrationDirectory, "example.feature"))),
    ensureDir(fixturesDirectory),
    ensureDir(pluginsDirectory).then(() =>
      copy(
        join(CODE_GENERATION_DIRECTORY, "pluginsIndex.js"),
        join(pluginsDirectory, "index.js")
      )
    ),
    ensureDir(supportDirectory).then(() =>
      Promise.all([
        copy(
          join(CODE_GENERATION_DIRECTORY, "supportIndex.js"),
          join(supportDirectory, "index.js")
        ),
        ensureDir(commandsDirectory).then(() =>
          copy(
            join(CODE_GENERATION_DIRECTORY, "commandsIndex.js"),
            join(commandsDirectory, "index.js")
          )
        ),
        ensureDir(stepDefinitionsDirectory).then(() =>
          Promise.all([
            copy(
              join(CODE_GENERATION_DIRECTORY, "stepDefinitionsIndex.js"),
              join(stepDefinitionsDirectory, "index.js")
            ),
            copy(
              join(CODE_GENERATION_DIRECTORY, "stepDefinitionsPluginFile.js"),
              join(stepDefinitionsDirectory, `${pluginName}.js`)
            )
          ])
        )
      ])
    )
  ]);
  // Check types
};
