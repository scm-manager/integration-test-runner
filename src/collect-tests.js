'use strict';

const { ensureDir, emptyDir, mkdtemp, remove, move, pathExists, readdir, stat } = require('fs-extra');
const { readFileSync } = require('fs');
const {spawn} = require('child_process');
const { organization } = require('./config');
const { join } = require('path');
const { tmpdir } = require('os');
const {parseStringPromise} = require('xml2js');
const logger = require("./logger");

/**
 * @param {Octokit} api
 * @param {string} repository
 * @param {Array<{version: string, sha: string}>} versions
 * @param {string} outPath
 *
 * @see https://stackoverflow.com/a/52269934
 */
async function collectTests(api, repository, versions, outPath, relativeTestsDir = 'e2e-tests/') {
  if (!versions.length) {
    logger.info(`Skipping ${repository}: no versions found`)
    return;
  }
  logger.info(`Collecting ${repository} (${versions.map(v => v.version).join(', ')}) ...`);

  const tmpClonePath = await mkdtemp(join(tmpdir(), `${repository}-`));

  try {
    logger.debug(`Cloning ${repository} into ${tmpClonePath} ...`);

    const cloneUrl = createCloneURL(repository);
    const git = createGit(tmpClonePath);

    await git(`clone`, `--no-checkout`, cloneUrl, `.`);
    await git(`sparse-checkout`, `set`, `--cone`, "pom.xml", relativeTestsDir);
    await git(`reset`, `--hard`, `HEAD`);

    logger.debug(`Collecting e2e tests for ${repository} ...`)
    for (const { version, sha } of versions) {
      await collectVersionTestFiles(tmpClonePath, version, sha, outPath, relativeTestsDir);
    }
    await collectDevelopTestFiles(tmpClonePath, outPath, relativeTestsDir);
  } finally {
    logger.trace(`Removing temporary working directory: ${tmpClonePath} ...`)
    await remove(tmpClonePath);
  }
}

function createGit(workingPath) {
  return (...args) => {
    logger.trace(`calling 'git'`);
    return new Promise((resolve, reject) => {
      const child = spawn("git", args, {cwd: workingPath});
      
      let stderr = "";

      child.stderr.on('data', data => {
        stderr += data;
      });

      child.on('exit', rc => {
        if (rc === 0) {
          resolve();
        } else {
          if (stderr) {
            logger.error(stderr);
          }
          reject(new Error(`process ends with ${rc}`))
        }
      })
    })
  }
};

function createCloneURL(repository) {
  let auth = "";
  const apiToken = process.env.GITHUB_API_TOKEN;
  if (apiToken) {
    auth = apiToken + "@";
  }
  return `https://${auth}github.com/${organization}/${repository}`;
}

async function collectVersionTestFiles(tmpDir, version, sha, outPath, relativeTestsDir) {
  logger.debug(`Checking out ${version} (${sha}) ...`)
  const git = createGit(tmpDir);
  await git(`checkout`, `-f`, sha);

  const versionPath = join(outPath, version);
  const testsPath = join(tmpDir, relativeTestsDir);

  if (await pathExists(testsPath)) {
    logger.debug(`Collecting contents of e2e-tests folder for version ${version} ...`);
    await ensureDir(versionPath);
    await emptyDir(versionPath);

    logger.debug(`Move content from ${testsPath} to ${versionPath} ...`);
    await moveDirContents(versionPath, testsPath);
    logger.debug(`Content collected for ${version} and moved to ${outPath}`);
  } else {
    logger.debug(`No e2e-tests folder in version ${version}, skipping ...`)
  }
}

async function collectDevelopTestFiles(tmpDir, outPath, relativeTestsDir) {
  logger.debug(`Checking out develop ...`)
  const git = createGit(tmpDir);
  await git(`checkout`, `develop`);

  const pomXml = readFileSync(join(tmpDir, 'pom.xml'));
  const pomJson = await parseStringPromise(pomXml);
  const [pomVersion] = pomJson.project.version;
  logger.debug(pomVersion);

  const versionPath = join(outPath, pomVersion);
  const testsPath = join(tmpDir, relativeTestsDir);

  if (await pathExists(testsPath)) {
    logger.debug(`Collecting contents of e2e-tests folder for version ${pomVersion} ...`);
    await ensureDir(versionPath);
    await emptyDir(versionPath);

    logger.debug(`Move content from ${testsPath} to ${versionPath} ...`);
    await moveDirContents(versionPath, testsPath);
    logger.debug(`Content collected for ${pomVersion} and moved to ${outPath}`);
  } else {
    logger.debug(`No e2e-tests folder in version ${pomVersion}, skipping ...`)
  }
}

/**
 * @param {string} from
 * @param {string} to
 * @param {string} file
 * @returns {Promise<void>}
 */
function moveFileIfExsists(from, to, file) {
  return moveIfExsists(join(from, file), join(to, file))
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {Promise<void>}
 */
async function moveIfExsists(from, to) {
  if (await pathExists(from)) {
    logger.trace(`Moving '${from}' to '${to}' ...`)
    await move(from, to, {
      overwrite: true
    })
    logger.trace(`Moved '${from}' to '${to}'!`)
  } else {
    logger.warn(`Nothing to move, '${from}' does not exist!`)
  }
}

/**
 * @param {string} to
 * @param {string} dirRoot
 * @param {string[]} path
 *
 * @returns {Promise<void>}
 */
async function moveDirContents(to, dirRoot, path = []) {
  const currentDir = join(dirRoot, ...path);
  if (!(await pathExists(currentDir))) {
    return;
  }
  const files = await readdir(currentDir);
  for (const file of files) {
    const filePath = join(currentDir, file);
    const fstat = await stat(filePath);
    if (fstat.isDirectory()) {
      await moveDirContents(to, dirRoot, [...path, file]);
    } else if (fstat.isFile() && file.match(/^.+\.spec\.(js|ts)$/g)) {
      await moveFileIfExsists(currentDir, to, file);
    }
  }
}

exports.collectTests = collectTests;
