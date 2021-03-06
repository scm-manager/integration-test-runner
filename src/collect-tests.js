"use strict";

const {
  ensureDir,
  emptyDir,
  mkdtemp,
  remove,
  move,
  pathExists,
  readdir,
  readFileSync,
  stat
} = require("fs-extra");
const { spawn } = require("child_process");
const { organization } = require("./config");
const { join } = require("path");
const { tmpdir } = require("os");
const fetch = require("isomorphic-fetch");
const logger = require("./logger");
const { parseStringPromise } = require("xml2js");

/**
 * @param {Octokit} api
 * @param {string} repository
 * @param {Array<{version: string, sha: string}>} versions
 * @param {string} outPath
 *
 * @see https://stackoverflow.com/a/52269934
 */
async function collectTests(
  api,
  repository,
  versions,
  outPath,
  relativeCypressDir = "src/test/e2e/cypress"
) {
  if (!versions.length) {
    logger.info(`Skipping ${repository}: no versions found`);
    return;
  }
  logger.info(
    `Collecting ${repository} (${versions.map(v => v.version).join(", ")}) ...`
  );

  const tmpClonePath = await mkdtemp(join(tmpdir(), `${repository}-`));

  try {
    logger.debug(`Cloning ${repository} into ${tmpClonePath} ...`);

    const cloneUrl = createCloneURL(repository);
    const git = createGit(tmpClonePath);

    await git(`clone`, `--no-checkout`, cloneUrl, `.`);
    await git(`sparse-checkout`, `init`, `--cone`);
    await git(`sparse-checkout`, `set`, relativeCypressDir);
    await git(`reset`, `--hard`, `HEAD`);

    logger.debug(`Collecting e2e tests for ${repository} ...`);
    for (const { version, sha } of versions) {
      await collectVersionTestFiles(
        tmpClonePath,
        version,
        sha,
        outPath,
        relativeCypressDir
      );
    }
    await collectDevelopTestFiles(
      repository,
      tmpClonePath,
      outPath,
      relativeCypressDir
    );
  } finally {
    logger.trace(`Removing temporary working directory: ${tmpClonePath} ...`);
    await remove(tmpClonePath);
  }
}

function createGit(workingPath) {
  return (...args) => {
    logger.trace(`calling 'git'`);
    return new Promise((resolve, reject) => {
      const child = spawn("git", args, { cwd: workingPath });

      let stderr = "";

      child.stderr.on("data", data => {
        stderr += data;
      });

      child.on("exit", rc => {
        if (rc === 0) {
          resolve();
        } else {
          if (stderr) {
            logger.error(stderr);
          }
          reject(new Error(`process ends with ${rc}`));
        }
      });
    });
  };
}

function createCloneURL(repository) {
  let auth = "";
  const apiToken = process.env.GITHUB_API_TOKEN;
  if (apiToken) {
    auth = apiToken + "@";
  }
  return `https://${auth}github.com/${organization}/${repository}`;
}

async function collectVersionTestFiles(
  tmpDir,
  version,
  sha,
  outPath,
  relativeCypressDir
) {
  logger.debug(`Checking out ${version} (${sha}) ...`);
  const git = createGit(tmpDir);
  await git(`checkout`, `-f`, sha);

  await collectTestFiles(tmpDir, outPath, relativeCypressDir, version);
}

async function collectDevelopTestFiles(
  repository,
  tmpDir,
  outPath,
  relativeCypressDir
) {
  logger.debug(`Checking out develop ...`);
  const git = createGit(tmpDir);
  await git(`checkout`, `develop`);

  const version = await fetchDevelopBranchVersion(repository, tmpDir);
  logger.debug(`Collect tests for ${version}`);

  await collectTestFiles(tmpDir, outPath, relativeCypressDir, version);
}

const fetchDevelopBranchVersion = async (repository, tmpDir) => {
  const gradleResponse = await fetch(
    `https://raw.githubusercontent.com/scm-manager/${repository}/develop/gradle.properties`,
    {
      headers: { Authorization: "token " + process.env.GITHUB_API_TOKEN }
    }
  );

  if (gradleResponse.ok) {
    const gradleProps = await gradleResponse.text();
    const lines = gradleProps.match(/[^\r\n]+/g);
    for (const line of lines) {
      if (line.startsWith("version")) {
        return line.split("=")[1].trim();
      }
    }
  } else {
    const pomXml = readFileSync(join(tmpDir, "pom.xml"));
    const pomJson = await parseStringPromise(pomXml);
    const version = pomJson.project.version;
    return Array.isArray(version) ? version[0] : version;
  }
  throw new Error("Could not find version");
};

async function collectTestFiles(tmpDir, outPath, relativeCypressDir, version) {
  logger.info(`Collect testfiles for ${outPath}, ${version}`);
  console.log(tmpDir, outPath, relativeCypressDir, version)
  const versionPath = join(outPath, version);
  const testsPath = join(tmpDir, relativeCypressDir);

  if (await pathExists(testsPath)) {
    logger.debug(`Collecting e2e tests for version ${version} ...`);
    await ensureDir(versionPath);
    await emptyDir(versionPath);

    // Commands
    const commandsInPath = join(testsPath, "support", "commands");
    const commandsOutPath = join(versionPath, "commands");
    logger.debug(
      `Move content from ${commandsInPath} to ${commandsOutPath} ...`
    );
    await moveDirContents(commandsOutPath, commandsInPath);

    // Features
    const featuresInPath = join(testsPath, "integration");
    const featuresOutPath = join(versionPath, "features");
    logger.debug(
      `Move content from ${featuresInPath} to ${featuresOutPath} ...`
    );
    await moveDirContents(featuresOutPath, featuresInPath);

    // Steps
    const stepsInPath = join(testsPath, "support", "step_definitions");
    const stepsOutPath = join(versionPath, "steps");
    logger.debug(`Move content from ${stepsInPath} to ${stepsOutPath} ...`);
    await moveDirContents(stepsOutPath, stepsInPath);

    // Fixtures
    const fixturesInPath = join(testsPath, "fixtures");
    const fixturesOutPath = join(versionPath, "fixtures");
    logger.debug(
        `Move content from ${fixturesInPath} to ${fixturesOutPath} ...`
    );
    await moveDirContents(fixturesOutPath, fixturesInPath);
    logger.debug(`Content collected for ${version} and moved to ${outPath}`);
  } else {
    logger.debug(`No e2e tests folder in version ${version}, skipping ...`);
  }
}

/**
 * @param {string} from
 * @param {string} to
 * @param {string} file
 * @returns {Promise<void>}
 */
function moveFileIfExsists(from, to, file) {
  return moveIfExsists(join(from, file), join(to, file));
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {Promise<void>}
 */
async function moveIfExsists(from, to) {
  if (await pathExists(from)) {
    logger.trace(`Moving '${from}' to '${to}' ...`);
    await move(from, to, {
      overwrite: true
    });
    logger.trace(`Moved '${from}' to '${to}'!`);
  } else {
    logger.warn(`Nothing to move, '${from}' does not exist!`);
  }
}

/**
 * @param {string} to
 * @param {string} dirRoot
 * @param {function} filter
 * @param {string[]} path
 *
 * @returns {Promise<void>}
 */
async function moveDirContents(to, dirRoot, filter = () => true, path = []) {
  const currentDir = join(dirRoot, ...path);
  if (!(await pathExists(currentDir))) {
    logger.debug(`Path '${currentDir}' does not exist, skipping ...`);
    return;
  }
  const files = await readdir(currentDir);
  for (const file of files) {
    const filePath = join(currentDir, file);
    const fstat = await stat(filePath);
    if (fstat.isDirectory()) {
      await moveDirContents(to, dirRoot, filter, [...path, file]);
    } else if (fstat.isFile() && filter(file)) {
      await moveFileIfExsists(currentDir, to, file);
    }
  }
}

exports.collectTests = collectTests;
