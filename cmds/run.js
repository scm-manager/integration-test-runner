const cypress = require('cypress');
const {cutVideo} = require('../src/cut-video');
const {unlinkSync} = require('fs');

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
    }
};
exports.handler = async argv => {
    const logger = require('../src/logger');

    logger.info("Running cypress ...");
    cypress.run({
        config: {
            baseUrl: argv.url,
            videoUploadOnPasses: false,
            videoCompression: false,
        },
        env: {
            USERNAME: argv.username,
            PASSWORD: argv.password
        },
        reporterOptions: {
            mochaFile: "target/cypress-reports/TEST-[hash].xml"
        },
        reporter: "junit",
        testFiles: "**/*.feature"
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