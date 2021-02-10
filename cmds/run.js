const cypress = require("cypress");
const { cutVideo } = require("../src/cut-video");
const { unlinkSync } = require("fs");

exports.command = "run";
exports.describe =
  "runs the provisioned test suite against a given scm-manager instance";
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
  open: {
    alias: "o",
    type: "boolean",
    description: "open cypress instead of just running it"
  },
  directory: {
    alias: "d",
    type: "string",
    description: "the relative directory cypress is in"
  }
};
exports.handler = async argv => {
  const logger = require("../src/logger");

  logger.info("Running cypress ...");
  cypress[argv.open ? "open" : "run"]({
    config: {
      baseUrl: argv.url,
      videoUploadOnPasses: false,
      videoCompression: false,
      screenshotsFolder: "../build/target/cypress/screenshots",
      videosFolder: "../build/target/cypress/videos"
    },
    env: {
      USERNAME: argv.username,
      PASSWORD: argv.password
    },
    reporterOptions: {
      mochaFile: "../build/target/cypress/reports/TEST-[hash].xml"
    },
    reporter: "junit",
    testFiles: "**/*.{feature,features}",
    project: argv.directory || "."
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
};
