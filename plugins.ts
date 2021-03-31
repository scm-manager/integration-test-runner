const browserify = require("@cypress/browserify-preprocessor");
const cucumber = require("cypress-cucumber-preprocessor").default;
import * as resolve from "resolve";
import { join } from "path";

export default (on: Function, config: any) => {
  const options = browserify.defaultOptions;

  const tsConfigPath = join(config.projectRoot, "cypress", "tsconfig.json");

  console.log("tsConfigPath", tsConfigPath);

  options.browserifyOptions.plugin.unshift(["tsify", { project: tsConfigPath }]);
  options.typescript = resolve.sync("typescript", { basedir: join(config.projectRoot, "cypress") });

  on("file:preprocessor", cucumber(options));
};
