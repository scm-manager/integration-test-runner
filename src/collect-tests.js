'use strict';

const { ensureDir, emptyDir, mkdtemp, remove, move, pathExists, readdir, stat } = require('fs-extra');
const {spawn} = require('child_process');
const { organization } = require('./config');
const { join } = require('path');
const { tmpdir } = require('os');
const logger = require("./logger");

/**
 * @param {Octokit} api
 * @param {string} repository
 * @param {Array<{version: string, sha: string}>} versions
 * @param {string} outPath
 *
 * @see https://stackoverflow.com/a/52269934
 */
async function collectTests(api, repository, versions, outPath) {
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
    await git(`sparse-checkout`, `set`, `--cone`, `e2e-tests/`);
    await git(`reset`, `--hard`, `HEAD`);

    logger.debug(`Collecting e2e tests for ${repository} ...`)
    for (const { version, sha } of versions) {
      await collectTestFiles(tmpClonePath, version, sha, outPath);
    }
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

async function collectTestFiles(tmpDir, version, sha, outPath) {
  logger.debug(`Checking out ${version} (${sha}) ...`)
  const git = createGit(tmpDir);
  await git(`checkout`, `-f`, sha);

  const versionPath = join(outPath, version);
  const testsPath = join(tmpDir, 'e2e-tests');

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
  const outDir = join(to, ...path);
  const files = await readdir(currentDir);
  await ensureDir(outDir);
  for (const file of files) {
    const filePath = join(currentDir, file);
    const fstat = await stat(filePath);
    if (fstat.isDirectory()) {
      await moveDirContents(to, dirRoot, [...path, file]);
    } else if (fstat.isFile()) {
      await moveFileIfExsists(currentDir, outDir, file);
    }
  }
}

exports.collectTests = collectTests;
