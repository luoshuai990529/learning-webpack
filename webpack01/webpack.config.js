/*
 * @Description: webpack01
 * @Date: 2022-12-10 21:58:46
 * @Author: luoshuai
 * @LastEditors: luoshuai
 * @LastEditTime: 2022-12-10 22:03:12
 */

// webpack.config.js
const path = require("path")

module.exports = {
    // 项目入口文件
    entry: "./src/index",
    // 产物输出路径
    output: {
        filename: "[name].js",
        path: path.join(__dirname, "./dist")
    },
    module: {
        // 为处理js以外的其他资源 如 css、ts、图片等资源添加适配的加载器loader
        rules: [{
            test: /\.less$/i,
            include: {
                and: [path.join(__dirname, './src/')]
            },
            use: [
                "style-loader",
                "css-loader",
                {
                    loader: "less-loader"
                }
            ]
        }]
    }
};