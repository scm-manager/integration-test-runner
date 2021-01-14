const {join} = require('path');
const axios = require('axios').default;
const {copySync, ensureDir, pathExists, emptyDir} = require('fs-extra');
const {writeFileSync} = require('fs');
const {EOL} = require('os');
const {forEachFileInDirectoryRecursive} = require('../src/foreach-file-in-directory-recursive');
const {copyDirContents} = require('../src/copy-dir-contents');

exports.command = "provision";
exports.describe = "prepare run command based on a given scm-manager instance's version and plugins";
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
    const outRootDir = join(__dirname, '..', 'cypress');
    const featuresOutRootDir = join(outRootDir, "integration");
    const supportOutRootDir = join(__dirname, '..', 'cypress', 'support');
    const stepsOutRootDir = join(supportOutRootDir, "step_definitions");
    const supportIndexFilePath = join(supportOutRootDir, 'index.js');
    let supportIndexJs = `import "../../commands";`;
    await emptyDir(outRootDir);
    await ensureDir(featuresOutRootDir);
    await ensureDir(supportOutRootDir);
    await ensureDir(stepsOutRootDir);
    for (const {name, version} of testsToRun) {
        const rootInDir = join(__dirname, '..', 'e2e-tests', name, version);

        // Collect Features
        const featuresInDir = join(rootInDir, "features");
        const featuresOutDir = join(featuresOutRootDir, name, version);
        await copyDirContents(featuresOutDir, featuresInDir, file => file.match(/^.+\.(feature|features)$/));

        // Collect Steps
        const stepsInDir = join(rootInDir, "steps");
        const stepsOutDir = join(stepsOutRootDir, name, version);
        await copyDirContents(stepsOutDir, stepsInDir);

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
            // Add import to support file which loads the commands, the plugin requires an "index" file for its commands to work
            supportIndexJs += `${EOL}import "./${name}";`;
        }
    }
    writeFileSync(supportIndexFilePath, supportIndexJs);

    // Check plugins file
    const pluginsRootPath = join(outRootDir, "plugins");
    const pluginsFilePath = join(pluginsRootPath, "index.js");
    if (!await pathExists(pluginsFilePath)) {
        await ensureDir(pluginsRootPath);
        writeFileSync(pluginsFilePath, "module.exports = require('../../plugins');");
    }
}