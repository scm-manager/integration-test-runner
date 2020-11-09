const { organization } = require("./config");
const logger = require("./logger");

/**
 * @param {Octokit} api
 * @param {string} repository
 * @returns {Promise<Array<string>>}
 */
async function collectPlugins(api) {
  const plugins = [];

  for await (const repositories of api.paginate.iterator(api.repos.listForOrg, {
    org: organization,
  })) {
    for (const {name} of repositories.data) {
      if (name.match(/^scm-[a-z-]+-plugin$/)) {
        plugins.push(name);
      } else {
        logger.debug(`skipped non-plugin repository '${name}'`);
      }
    }
  }

  return plugins;
}

exports.collectPlugins = collectPlugins;
