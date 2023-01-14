/*
 * @Description: 这是***页面（组件）
 * @Date: 2023-01-14 14:40:02
 * @Author: luoshuai
 * @LastEditors: luoshuai
 * @LastEditTime: 2023-01-14 16:02:07
 */
const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { GenerateSW } = require("workbox-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");

module.exports = {
    entry: './src/index.js',
    mode: 'development',
    devtool: false,
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: './'
    },
    devServer: {
        host: '127.0.0.1',
        hot: true, // 用于声明是否使用热更新能力，接受 bool 值。
        open: true, // 用于声明是否自动打开页面，接受 bool 值。
        port: 8087,
        // publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: { presets: ['@babel/preset-env'] }
                }
            },
            { test: /\.vue$/, use: ['vue-loader'] },
            { test: /\.css$/, use: ["style-loader", "css-loader"] },
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        // new HtmlWebpackPlugin({
        //     templateContent: `
        //                 <!DOCTYPE html>
        //                 <html>
        //                 <head>
        //                     <meta charset="utf-8">
        //                     <title>Webpack App</title>
        //                 </head>
        //                 <body>
        //                     <div id="app" ></div>
        //                 </body>
        //                 </html>
        //                     `
        // }),
        // new HtmlWebpackPlugin({
        //     title: "Progressive Web Application",
        //   }),
        new HtmlWebpackPlugin({
            filename: `index.html`,
            template: './public/index.html', //加载自定义模板
            // chunks: [`index`]
        }),
        // 自动生成 Manifest 文件
        new WebpackPwaManifest({
            name: "My Progressive Web App",
            short_name: "MyPWA",
            description: "My awesome Progressive Web App!",
            publicPath: "/",
            icons: [
                {
                    // 桌面图标，注意这里只支持 PNG、JPG、BMP 格式
                    src: path.resolve("src/assets/icon.png"),
                    sizes: [150],
                },
            ],
        }),
        // 自动生成 ServiceWorker 文件
        new GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
        }),
    ]
}