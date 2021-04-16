const { join, isAbsolute } = require("path");
const axios = require("axios").default;
const {
  copySync,
  ensureDir,
  pathExists,
  emptyDir,
  pathExistsSync
} = require("fs-extra");
const { writeFileSync } = require("fs");
const { EOL } = require("os");
const {
  forEachFileInDirectoryRecursive
} = require("../src/foreach-file-in-directory-recursive");
const { copyDirContents } = require("../src/copy-dir-contents");
const waitUntilServerIsAvailable = require("../src/waitUntilServerIsAvailable");

const CWD = process.cwd();

exports.command = "provision";
exports.describe =
  "prepare run command based on a given scm-manager instance's version and plugins";
exports.builder = {
  url: {
    alias: "a",
    default: "http://localhost:8081/scm",
    type: "string",
    description: "url to scm-manager instance"
  },
  username: {
    alias: "u",
    type: "string",
    description: "scm-manager account username"
  },
  password: {
    alias: "p",
    type: "string",
    description: "scm-manager account password"
  },
  directory: {
    alias: "d",
    type: "string",
    description:
      "the relative path to the cypress directory (will be created if it doesnt exist)"
  }
};
exports.handler = async argv => {
  const logger = require("../src/logger");

  await waitUntilServerIsAvailable(argv.url);

  logger.info("Collecting versions from scm manager instance ...");
  const axiosInstance = axios.create({
    baseURL: `${argv.url}/api/v2/`,
    headers: {
      "Content-Type": "application/json;charset=UTF-8"
    }
  });
  const { data: accessToken } = await axiosInstance.post("auth/access_token", {
    grant_type: "password",
    "cookie:": false,
    username: argv.username,
    password: argv.password
  });

  const {
    data: { version: coreVersion }
  } = await axiosInstance.get("/", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const {
    data: {
      _embedded: { plugins }
    }
  } = await axiosInstance.get("/plugins/installed", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const testsToRun = plugins
    .filter(
      ({ name }) =>
        ![
          "scm-git-plugin",
          "scm-hg-plugin",
          "scm-svn-plugin",
          "scm-legacy-plugin"
        ].includes(name)
    )
    .map(({ name, version }) => ({
      name,
      version
    }));
  testsToRun.push({ name: "scm-manager", version: coreVersion });

  logger.info("Collecting tests to run ...");
  let rootDir = CWD;
  if (argv.directory) {
    if (isAbsolute(argv.directory)) {
      rootDir = argv.directory;
    } else {
      rootDir = join(CWD, argv.directory);
    }
  }
  const cypressDir = join(rootDir, "cypress");
  const outRootDir = cypressDir;
  const featuresOutRootDir = join(outRootDir, "integration");
  const fixturesOutRootDir = join(outRootDir, "fixtures");
  const supportOutRootDir = join(cypressDir, "support");
  const stepsOutRootDir = join(supportOutRootDir, "step_definitions");
  const supportIndexFilePath = join(supportOutRootDir, "index.js");
  let supportIndexJs = `import "${createRootFileImportPath(
    "commands",
    join("..", "..")
  )}";`;
  const stepsIndexFilePath = join(stepsOutRootDir, "index.js");
  await emptyDir(outRootDir);
  await ensureDir(featuresOutRootDir);
  await ensureDir(supportOutRootDir);
  await ensureDir(stepsOutRootDir);
  await ensureDir(fixturesOutRootDir);
  for (const { name, version } of testsToRun) {
    const rootInDir = join(rootDir, "e2e-tests", name, version);

    // Collect Features
    const featuresInDir = join(rootInDir, "features");
    const featuresOutDir = join(featuresOutRootDir, name, version);
    await copyDirContents(featuresOutDir, featuresInDir, file =>
      file.match(/^.+\.(feature|features)$/)
    );

    // Collect Steps
    const stepsInDir = join(rootInDir, "steps");
    const stepsOutDir = join(stepsOutRootDir, name, version);
    await copyDirContents(stepsOutDir, stepsInDir, file => file !== "index.js");

    // Collect fixtures
    const fixturesInDir = join(rootInDir, "fixtures");
    // const fixturesOutDir = join(fixturesOutRootDir);
    await copyDirContents(fixturesOutRootDir, fixturesInDir);

    // Collect Commands
    const commandsInDir = join(rootInDir, "commands");
    if (await pathExists(commandsInDir)) {
      const commandsOutRootDir = join(supportOutRootDir, name);
      await forEachFileInDirectoryRecursive(commandsInDir, path => {
        const fileIn = join(commandsInDir, ...path);
        const fileName = path.pop();
        const commandOut = join(commandsOutRootDir, fileName);
        logger.debug(`Copying command from ${fileIn} to ${commandOut}`);
        copySync(fileIn, commandOut);
      });
      // Add import to support file which loads the commands and steps, the plugin requires an "index" file for its commands to work
      supportIndexJs += `${EOL}import "./${name}";`;
    }
  }
  writeFileSync(
    stepsIndexFilePath,
    `import "${createRootFileImportPath("steps", join("..", "..", ".."))}";`
  );
  writeFileSync(supportIndexFilePath, supportIndexJs);

  // Check plugins file
  const pluginsRootPath = join(outRootDir, "plugins");
  const pluginsFilePath = join(pluginsRootPath, "index.js");
  if (!(await pathExists(pluginsFilePath))) {
    await ensureDir(pluginsRootPath);
    writeFileSync(
      pluginsFilePath,
      `module.exports = require('${createRootFileImportPath(
        "plugins",
        join("..", "..")
      )}');`
    );
  }
};

function createRootFileImportPath(filename, relativePathToRootDirFromTarget) {
  const path = join(CWD, `${filename}.js`);
  const pathExist = pathExistsSync(path);
  return pathExist
    ? join(relativePathToRootDirFromTarget, filename)
    : `@scm-manager/integration-test-runner/${filename}`;
}
