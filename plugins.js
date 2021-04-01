const browserify = require("@cypress/browserify-preprocessor");
const cucumber = require("cypress-cucumber-preprocessor").default;
const resolve = require("resolve");

console.log("HELLO PLUGINS 2");

module.exports = (on, config) => {
  console.log("HELLO PLUGINS 3");
  const options = {
    ...browserify.defaultOptions,
    typescript: resolve.sync("typescript", { baseDir: config.projectRoot })
  };

  console.log("HELLO PLUGINS 4");

  on("file:preprocessor", cucumber(options));
};
