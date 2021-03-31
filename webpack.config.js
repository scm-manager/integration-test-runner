const WebpackLogPlugin = require("./webpack-log-plugin");

module.exports = {
  resolve: {
    extensions: [".ts", ".js"]
  },
  node: { fs: "empty", child_process: "empty", readline: "empty" },
  plugins: [new WebpackLogPlugin()],
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: "babel-loader",
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
            loader: "cypress-cucumber-preprocessor/loader"
          }
        ]
      },
      {
        test: /\.features$/,
        use: [
          {
            loader: "cypress-cucumber-preprocessor/lib/featuresLoader"
          }
        ]
      }
    ]
  }
};
