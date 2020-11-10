const cypress = require('cypress');
const {cutVideo} = require('../src/cut-video');
const {join} = require('path');
const axios = require('axios').default;
const {unlinkSync} = require('fs');
const {pathExists, copySync, ensureDir} = require('fs-extra');
const {forEachFileInDirectoryRecursive} = require('../src/foreach-file-in-directory-recursive');

exports.command = "run";
exports.describe = "runs the provided test suite against a given scm-manager instance";
exports.builder = {
    url: {
        alias: 'a',
        default: "http://localhost:8081/scm",
        type: 'string',
        description: "url to scm-manager instance"
    },
    username: {
        alias: 'u',
        type: 'string',
        description: "scm-manager account username"
    },
    password: {
        alias: 'p',
        type: 'string',
        description: "scm-manager account password"
    },
    clean: {
        alias: 'c',
        type: "boolean",
        description: "always collect up-to-date tests"
    }
};
exports.handler = async argv => {
    const logger = require('../src/logger');

    if (!await pathExists(join(__dirname, '..', 'cypress', 'integration')) || argv.clean) {

        logger.info("Collecting versions from scm manager instance ...");
        const axiosInstance = axios.create({
            baseURL: `${argv.url}/api/v2/`,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
            }
        });
        const {data: accessToken} = await axiosInstance.post("auth/access_token", {
            "grant_type": "password",
            "cookie:": false,
            "username": argv.username,
            "password": argv.username
        });

        const {data: {version: coreVersion}} = await axiosInstance.get("/", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const {data: {_embedded: {plugins}}} = await axiosInstance.get("/plugins/installed", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })

        const testsToRun = plugins.map(({name, version}) => ({name, version}));
        testsToRun.push({name: 'scm-manager', version: coreVersion});

        logger.info("Collecting tests to run ...");
        const testsOutDir = join(__dirname, '..', 'cypress', "integration");
        await ensureDir(testsOutDir);
        for (const {name, version} of testsToRun) {
            const testsInDir = join(__dirname, '..', 'e2e-tests', name, version);
            await forEachFileInDirectoryRecursive(testsInDir, path => {
                const testIn = join(testsInDir, ...path);
                const testOut = join(testsOutDir, path.pop());
                logger.debug(`Copying test from ${testIn} to ${testOut}`)
                copySync(testIn, testOut);
            });
        }
    }

    logger.info("Running cypress ...");
    cypress.run({
        reporter: "junit",
        configFile: false,
        reporterOptions: {
            mochaFile: join("..", "target", "cypress-reports", "TEST-[hash].xml")
        },
        config: {
            baseUrl: argv.url,
            videoUploadOnPasses: false,
            videoCompression: false,
        },
        env: {
            USERNAME: argv.username,
            PASSWORD: argv.password
        }
    })
        .then(results => {
            results.runs.forEach(run => {
                // remove videos of successful runs
                if (!run.shouldUploadVideo) {
                    unlinkSync(run.video);
                } else {
                    const cuts = [];
                    run.tests.forEach(test => {
                        if (test.state !== "passed") {
                            cuts.push(cutVideo(run.video, test));
                        }
                    });
                    Promise.all(cuts)
                        .then(() => unlinkSync(run.video))
                        .catch(err => logger.error("failed to cut video", err));
                }
            });
        })
        .catch(err => logger.error(err));
    ;
}