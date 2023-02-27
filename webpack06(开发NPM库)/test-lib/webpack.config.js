const path = require("path");
const nodeExternals = require('webpack-node-externals');

module.exports = {
    mode: "development",
    entry: "./src/index.js",
    output: {
        filename: "[name].js",
        path: path.join(__dirname, "./dist"),
        library: {
            name: "-",
            type: "umd"
        }
    },
    // externals: {
    //     lodash: {
    //         commonjs: "lodash",
    //         commonjs2: "lodash",
    //         amd: "lodash",
    //         root: "_",
    //     }
    // },
    externals: [nodeExternals()]
};