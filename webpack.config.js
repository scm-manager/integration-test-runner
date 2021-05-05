// use require.resolve to get the actual path of the loaders,
// because webpack may running in a subfolder of a plugin

const babelLoader = require.resolve("babel-loader");
const featureLoader = require.resolve("cypress-cucumber-preprocessor/loader");
const featuresLoader = require.resolve("cypress-cucumber-preprocessor/lib/featuresLoader");

module.exports = {
  resolve: {
    extensions: [".ts", ".js"]
  },
  node: { fs: "empty", child_process: "empty", readline: "empty" },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: babelLoader,
            options: {
              presets: ["@scm-manager/babel-preset"]
            }
          }
        ]
      },
      {
        test: /\.feature$/,
        use: [
          {
            loader: featureLoader
          }
        ]
      },
      {
        test: /\.features$/,
        use: [
          {
            loader: featuresLoader
          }
        ]
      }
    ]
  }
};
