module.exports = class WebpackLogPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.hooks.done.tap("debug", stats => {
      const { path, filename } = stats.compilation.options.output;
      console.log(`DEBUG (file): ${path}, ${filename}`);
    });
    compiler.hooks.normalModuleFactory.tap("debug", factory => {
      factory.hooks.parser.for("javascript/auto").tap("debug", (parser, options) => {
        parser.hooks.importSpecifier.tap("debug", (statement, source, exportName, identifierName) => {
          console.log(`DEBUG (source): ${source}`);
        });
      });
    });
  }
};
