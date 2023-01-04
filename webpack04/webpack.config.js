const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    mode: 'development',
    devtool: false,
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    devServer: {
        hot: true, // 用于声明是否使用热更新能力，接受 bool 值。
        open: true // 用于声明是否自动打开页面，接受 bool 值。
    },
    module: {
        rules: [
            { test: /\.vue$/, use: ['vue-loader'] },
            { test: /\.css$/, use: ["style-loader", "css-loader"] },
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new HtmlWebpackPlugin({
            templateContent: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <title>Webpack App</title>
                        </head>
                        <body>
                            <div id="app" ></div>
                        </body>
                        </html>
                            `
        })
    ]
}