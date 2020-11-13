const { pathExists, readdir, stat, copySync } = require('fs-extra');
const { join } = require('path');
const logger = require("./logger");

/**
 * @param {string} from
 * @param {string} to
 * @param {string} file
 * @returns {Promise<void>}
 */
function copyFileIfExists(from, to, file) {
    return copySync(join(from, file), join(to, file))
}

/**
 * @param {string} to
 * @param {string} dirRoot
 * @param {function} filter
 * @param {string[]} path
 *
 * @returns {Promise<void>}
 */
async function copyDirContents(to, dirRoot, filter = () => true, path = []) {
    const currentDir = join(dirRoot, ...path);
    if (!(await pathExists(currentDir))) {
        logger.debug(`Path '${currentDir}' does not exist, skipping ...`)
        return;
    }
    const files = await readdir(currentDir);
    for (const file of files) {
        const filePath = join(currentDir, file);
        const fstat = await stat(filePath);
        if (fstat.isDirectory()) {
            await copyDirContents(to, dirRoot, filter,[...path, file]);
        } else if (fstat.isFile() && filter(file)) {
            await copyFileIfExists(currentDir, to, file);
        }
    }
}

exports.copyDirContents = copyDirContents;