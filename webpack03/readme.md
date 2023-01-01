## Webpack 如何处理 CSS 资源？

因为webpack不能识别css语法，因此在webpack中处理CSS文件，经常要用到：

- [`css-loader`](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Floaders%2Fcss-loader%2F)：该 Loader 会将 CSS 等价翻译为形如 `module.exports = "${css}"` 的JavaScript 代码，使得 Webpack 能够如同处理 JS 代码一样解析 CSS 内容与资源依赖；
- [`style-loader`](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Floaders%2Fstyle-loader%2F)：该 Loader 将在产物中注入一系列 runtime 代码，这些代码会将 CSS 内容注入到页面的 `<style>` 标签，使得样式生效；
- [`mini-css-extract-plugin`](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fplugins%2Fmini-css-extract-plugin)：该插件会将 CSS 代码抽离到单独的 `.css` 文件，并将文件通过 `<link>` 标签方式插入到页面中。

> PS：当 Webpack 版本低于 5.0 时，请使用 [`extract-text-webpack-plugin`](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fextract-text-webpack-plugin) 代替 `mini-css-extract-plugin`。

三种组件各司其职：`css-loader` 让 Webpack 能够正确理解 CSS 代码、分析资源依赖；`style-loader`、`mini-css-extract-plugin` 则通过适当方式将 CSS 插入到页面，对页面样式产生影响

将JS、CSS代码合并进同一个产物文件的方式有几个问题：

- JS、CSS 资源无法并行加载，从而降低页面性能；
- 资源缓存粒度变大，JS、CSS 任意一种变更都会致使缓存失效。

因此，生产环境中通常会用 [`mini-css-extract-plugin`](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fplugins%2Fmini-css-extract-plugin) 插件替代 `style-loader`，将样式代码抽离成单独的 CSS 文件。

安装依赖：
```javascript
yarn add -D style-loader css-loader mini-css-extract-plugin html-webpack-plugin
```

添加配置：
```javascript
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HTMLWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    module: {
        rules: [{
            test: /\.css$/,
            use: [
                // 根据运行环境判断使用那个 loader
                (process.env.NODE_ENV === 'development' ?
                    'style-loader' :
                    MiniCssExtractPlugin.loader),
                'css-loader'
            ]
        }]
    },
    plugins: [
        new MiniCssExtractPlugin(),
        new HTMLWebpackPlugin()
    ]
}
```

注意点：

- `mini-css-extract-plugin` 库同时提供 Loader、Plugin 组件，需要同时使用
- `mini-css-extract-plugin` 不能与 `style-loader` 混用，否则报错，所以上述示例中第 9 行需要判断 `process.env.NODE_ENV` 环境变量决定使用那个 Loader
- `mini-css-extract-plugin` 需要与 `html-webpack-plugin` 同时使用，才能将产物路径以 `link` 标签方式插入到 html 中

## 使用预处理器

在Webpack中接入Less：
```
yarn add -D less less-loader
```

修改配置：
```javascript
module.exports = {
    module: {
        rules: [{
            test: /\.less$/,
            use: [
                'style-loader',
                'css-loader',
                'less-loader'
            ]
        }]
    }
}
```

less-loader用于将Less代码转换为css代码，CSS代码随后会被css-loader和style-loader处理，最终在页面生效。

在Webpack中接入sass：
```javascript
yarn add -D sass sass-loader
```

webpack配置：

```javascript
module.exports = {

  module: {

    rules: [

      {

        test: /\.s[ac]ss$/,

        use: [

          "style-loader", 

          "css-loader", 

          "sass-loader"

        ],

      },

    ],

  }

};
```

## 使用 post-css

与上面的预处理器类似，post-css也能在原生css基础上增加更多表达力、可维护性、可读性的语言特性。它和`@babel/core`类似，只是实现了一套将css源码解析为AST结构，并传入PostCSS插件做处理的流程框架，具体功能都由插件实现。

接入post-css:

```javascript
yarn add -D postcss postcss-loader
```

此时post-css还只是个空壳，我们需要使用适当的PostCSS插件进行具体的功能处理，例如我们可以使用`autoprefixer`插件自动添加浏览器前缀：
```javascript
yarn add -D autoprefixer
```

修改配置：
```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          "style-loader", 
          {
            loader: "css-loader",            
            options: {
              importLoaders: 1
            }
          }, 
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                // 添加 autoprefixer 插件
                plugins: [require("autoprefixer")],
              },
            },
          }
        ],
      },
    ],
  }
};
```

























