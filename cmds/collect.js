const {Octokit} = require("@octokit/rest");
const {collectPlugins} = require('../src/collect-plugins');
const {collectReleases} = require('../src/collect-releases');
const {collectTests} = require('../src/collect-tests');
const {join} = require('path');
const {emptyDir} = require('fs-extra');
const AdmZip = require('adm-zip');

exports.command = "collect";
exports.describe = "collect available tests from repositories";
exports.builder = {
  outPath: {
      alias: 'o',
      default: join(process.cwd(), 'scm-manager-e2e-tests.zip'),
      type: 'string',
      description: "Path and filename of generated archive"
  },
    clean: {
      alias: 'c',
        type: "boolean",
        description: "Empty output directory beforehand"
    },
    skipArchive: {
      alias: 's',
        type: "boolean",
        description: "Dont create archive"
    }
};
exports.handler = async argv => {
    const logger = require('../src/logger');

    logger.info("Starting preparation process...");
    const outDir = join(__dirname, '..', 'e2e-tests');
    const zipPath = argv.outPath;

    logger.trace("Creating github api interface ...");
    const api = new Octokit({
        auth: process.env.GITHUB_API_TOKEN
    });

    if (argv.clean) {
        logger.info("Cleaning output directory ...");
        await emptyDir(outDir)
    }

    logger.info("Collecting core releases ...");
    const coreReleases = await collectReleases(api, "scm-manager");

    logger.info("Collecting core tests ...");
    await collectTests(api, "scm-manager", coreReleases, join(outDir, "scm-manager"), "scm-ui/e2e-tests/cypress");

    logger.info("Collecting plugin repositories ...");
    const repositories = await collectPlugins(api);
    logger.info("Collecting plugin releases ...");
    const repositoriesWithReleases = await Promise.all(repositories.map(repository => collectReleases(api, repository).then(releases => ({repository, releases}))));
    logger.info("Collecting plugin tests ...");
    await Promise.all(repositoriesWithReleases.map(({repository, releases}) => collectTests(api, repository, releases, join(outDir, repository))));

    if (!argv.skipArchive) {
        logger.info("Archive tests and runtime ...");
        const zip = new AdmZip();

        zip.addLocalFolder(join(__dirname, '..'), undefined);

        logger.info(`Write archive to: ${zipPath}`);
        await new Promise(resolve => zip.writeZip(zipPath, resolve));
    }

    logger.info(`Done`);
}