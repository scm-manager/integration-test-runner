const {Octokit} = require("@octokit/rest");
const {collectPlugins} = require('../src/collect-plugins');
const {collectReleases} = require('../src/collect-releases');
const {collectTests} = require('../src/collect-tests');
const {join} = require('path');

exports.command = "prepare";
exports.describe = "collect and package tests";
exports.handler = async argv => {
    const logger = require('../src/logger');

    logger.info("Starting preparation process...");

    logger.trace("Creating github api interface ...");
    const api = new Octokit({
        auth: process.env.GITHUB_API_TOKEN
    });

    logger.info("Collecting plugin repositories ...");
    const repositories = [
        'scm-manager',
        ...await collectPlugins(api)
    ];

    logger.info("Collecting repository releases ...");
    const repositoriesWithReleases = await Promise.all(repositories.map(repository => collectReleases(api, repository).then(releases => ({repository, releases}))));
    logger.info("Collecting tests ...");
    await Promise.all(repositoriesWithReleases.map(({repository, releases}) => collectTests(api, repository, releases, join(__dirname, '..', 'e2e-tests', repository))));

    logger.info("Zip tests and runtime ...");
}