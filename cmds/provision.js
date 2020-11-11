const {join} = require('path');
const axios = require('axios').default;
const {copySync, ensureDir} = require('fs-extra');
const {writeFileSync} = require('fs');
const {EOL} = require('os');
const {forEachFileInDirectoryRecursive} = require('../src/foreach-file-in-directory-recursive');

exports.command = "provision";
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
        "password": argv.password
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

    const testsToRun = plugins.filter(({name}) => !["scm-git-plugin", "scm-hg-plugin", "scm-svn-plugin", "scm-legacy-plugin"].includes(name)).map(({name, version}) => ({
        name,
        version
    }));
    testsToRun.push({name: 'scm-manager', version: coreVersion});

    logger.info("Collecting tests to run ...");
    const testsOutDir = join(__dirname, '..', 'cypress', "integration");
    const commandsOutDir = join(__dirname, '..', 'cypress', 'support');
    const supportIndexFilePath = join(commandsOutDir, 'index.js');
    let supportIndexJs = `import "../../commands";`;
    await ensureDir(testsOutDir);
    for (const {name, version} of testsToRun) {
        const testsInDir = join(__dirname, '..', 'e2e-tests', name, version);
        await forEachFileInDirectoryRecursive(testsInDir, path => {
            const fileIn = join(testsInDir, ...path);
            const fileName = path.pop();
            if (fileName.match(/^.+\.(spec|feature)\.(js|ts)$/g)) {
                const testOut = join(testsOutDir, fileName);
                logger.debug(`Copying test from ${fileIn} to ${testOut}`)
                copySync(fileIn, testOut);
            } else if (fileName.match(name + '\.js')) {
                const commandOut = join(commandsOutDir, fileName);
                logger.debug(`Copying command from ${fileIn} to ${commandOut}`);
                copySync(fileIn, commandOut);
                supportIndexJs += `${EOL}import "./${fileName}";`;
            }

        });
    }
    writeFileSync(supportIndexFilePath, supportIndexJs);
}