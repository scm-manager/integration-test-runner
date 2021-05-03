const {
  writeJsonSync,
  readJsonSync,
  ensureDirSync,
  writeFileSync,
  readFileSync
} = require("fs-extra");
const { join } = require("path");

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
  packagePath.scripts.e2e =
    "integration-test-runner run -u scmadmin -p scmadmin -O ../../../build/target/ -d ./src/test/e2e";
  writeJsonSync(packagePath, packageContent);
  // Create folder structure
  const e2eTestDir = join(CWD, "src", "test", "e2e");
  const cypressDir = join(e2eTestDir, "cypress");
  // - Create cypress.json
  ensureDirSync(cypressDir);
  writeJsonSync(join(cypressDir, "cypress.json"), {});
  // - Create plugins directory
  const pluginsDirectory = join(cypressDir, "plugins");
  ensureDirSync(pluginsDirectory);
  writeFileSync(
    join(pluginsDirectory, "index.js"),
    readFileSync(join(CODE_GENERATION_DIRECTORY, "pluginsIndex.js"))
  );
  // - Create support directory
  const supportDirectory = join(cypressDir, "support");
  ensureDirSync(supportDirectory);
  writeFileSync(
    join(supportDirectory, "index.js"),
    readFileSync(join(CODE_GENERATION_DIRECTORY, "supportIndex.js"))
  );
  // - Create commands directory
  const commandsDirectory = join(supportDirectory, "commands");
  ensureDirSync(commandsDirectory);
  writeFileSync(
    join(commandsDirectory, "index.js"),
    readFileSync(join(CODE_GENERATION_DIRECTORY, "commandsIndex.js"))
  );
  // - Create step_definitions directory
  const stepDefinitionsDirectory = join(supportDirectory, "step_definitions");
  ensureDirSync(stepDefinitionsDirectory);
  writeFileSync(
    join(stepDefinitionsDirectory, "index.js"),
    readFileSync(join(CODE_GENERATION_DIRECTORY, "stepDefinitionsIndex.js"))
  );
  writeFileSync(
    join(stepDefinitionsDirectory, "index.js"),
    readFileSync(join(CODE_GENERATION_DIRECTORY, "stepDefinitionsIndex.js"))
  );
  // Check types
};
