# 搭建Vue全栈开发环境

使用Webpack 搭建Vue 应用开发环境，包括：

- 如何使用 `vue-loader` 处理 Vue SFC 文件？
- 如何使用 `html-webpack-plugin`、`webpack-dev-server` 运行 Vue 应用？
- 如何在 Vue SFC 中复用 TypeScript、Less、Pug 等编译工具？
- 如何搭建 Vue SSR 环境？
- 如何使用 Vue CLI？

## 使用 Vue-loader 处理 SFC(单文件组件) 代码

形态上，Vue SFC（Single File Component）是使用类 html 语法描述Vue组件的自定义文件格式，文件由四种类型的顶层语法块组成：

- `<template>`:指定Vue组件模板，支持html、Pug等语法，内容会被预编译为Javascript渲染函数；
- `<script>`:用于定义组件选项对象，在Vue2版本支持导出普通对象或 defineComponent值；Vue3之后还支持`<script setup>`方式定义组件的 `setup()`函数；
- `<style>`:用于定义组件样式，通过配置Loader可以实现Less、Sass等预处理器语法支持；也可以通过添加`scoped、module`属性将样式封装在当前组件内；
- Custom Block: 用于满足淋雨特定需求而预留的SFC扩展模块，例如`<docs>` ; Custom Block 通常需要搭配特定工具使用，详情参考[Custom Blocks | Vue Loader](https://link.juejin.cn/?target=https%3A%2F%2Fvue-loader.vuejs.org%2Fguide%2Fcustom-blocks.html%23example) 。

原生Webpack不能处理这种内容格式的文件，需要我们引入Vue SFC的加载器：vue-loader:
```javascript
yarn add -D webpack webpack-cli vue-loader
```

修改webpack 配置，加入相关声明：
```javascript
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: ["vue-loader"],
      },
    ],
  },
  plugins: [new VueLoaderPlugin()],
};
```

> 提示：`vue-loader` 库同时提供用于处理 SFC 代码转译的 Loader 组件，与用于处理上下文兼容性的 Plugin 组件，两者需要同时配置才能正常运行。

经过 `vue-loader` 处理后，SFC 各个模块会被等价转译为普通 JavaScript 模块，例如：

![webpack4-1](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/webpack4-1.png)

可以看到，模板的内容被转移为用于构造 VDom（虚拟dom）结构的render函数；`<script>`标签导出的对象会被转译为javascript对象字面量形式。

> 注意：此时，上述webpack配置还无法处理CSS代码，此时添加style模块将会报错

为此需要添加处理CSS规则，完整配置：

```javascript
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  module: {
    rules: [
      { test: /\.vue$/, use: ["vue-loader"] },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [new VueLoaderPlugin()],
};
```

同样的，`style`模块也将被转移为JavaScript 内容：
![webpack4-2](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/webpack4-2.png)

#运行页面

上例接入的`vue-loader`使webpack能够正确的理解 Vue SFC 文件的内容，接着我们让其页面运行起来，这里要用到：

- `html-webpack-plugin` 自动生成HTML页面；
- `webpack-dev-server`让页面真正运行起来，具备热更新能力。

其中`html-webpack-plugin`是一款根据编译产物自动生成HTML文件的Webpack插件，借助这个插件我们无需手动维护产物数量、路径、hash值更新等问题。安装依赖：
```javascript
yarn add -D html-webpack-plugin
```

然后修改配置：
```javascript
const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  module: {
    rules: [
      { test: /\.vue$/, use: ["vue-loader"] }
    ],
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
    <div id="app" />
  </body>
</html>
    `,
    }),
  ],
};
```

为了提高我们本地开发效率，我们需要安装`webpack-dev-sever`，为我们提供热更新能力：
```javascript
npm install -D webpack-dev-server
```

再修改其webpack配置，运行 `npx webpack server`

```javascript
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
```

# 使用SSR(server side render)

通常，vueJS程序会被构建成一套纯客户端运行的SPA应用，相比于传统的JSP、它解决了很多前后端分工的性能、分工等问题，但是同时引入了新的问题：

- SEO不友好：多数搜索引擎对网页的解读依赖于同步HTML内容——假设你的应用最开始只展示一个加载动画，然后动过Ajax请求的数据进行渲染，爬虫并不会等待异步操作完成后才解析页面的内容，因此SPA通常无法向爬虫提供有用的信息
- Time-To-Content更长：因为客户端需要等待所有的JavaScript资源加载完毕后，才会开始渲染页面真正有意义的内容，所以时间会更长。

而SSR 服务端渲染就是为了解决这类问题而出现。本质上，SSR是一种在服务端将组件渲染成HTML字符串 再发送到浏览器，最后在浏览器将这些HTML片段激活为客户端上可交互的应用技术。

在Vue的场景下，通常可以选择[Nuxt.js](https://link.juejin.cn/?target=https%3A%2F%2Fnuxtjs.org%2F)、[Quasar](https://link.juejin.cn/?target=https%3A%2F%2Fquasar.dev%2F)、[`@vue/server-renderer`](https://link.juejin.cn/?target=https%3A%2F%2Fvuejs.org%2Fguide%2Fscaling-up%2Fssr.html) 等方案实现 SSR，这些技术的底层逻辑都包含三个大的步骤：

- 编译时，将同一组件构建为适合在客户端、服务器运行的两份副本；
- 服务端接收到请求时，调用 Render 工具将组件渲染为 HTML 字符串，并返回给客户端；
- 客户端运行 HTML，并再次执行组件代码，“激活(Hydrate)” 组件。

我们使用Vue3、Webpack、Express、@vue/server-renderer 可以搭建一套vue ssr应用，示例结构目录：
```vbscript
├─ 4-2_use-ssr
│  ├─ package.json
│  ├─ server.js
│  ├─ src
│  │  ├─ App.vue
│  │  ├─ entry-client.js
│  │  ├─ entry-server.js
│  ├─ webpack.base.js
│  ├─ webpack.client.js
│  └─ webpack.server.js
```

**entry-client.js**和**entry-server.js**的内容区别在于：客户端版本会立马调用mout接口，而服务端版只会export导出一个创建应用的工厂函数：

```javascript
// entry-client.js
import { createSSRApp } from "vue";
import App from "./App.vue";
createSSRApp(App).mount("#app");
```

```javascript
// entry-server.js
import App from "./App.vue";
export default () => {
  return createSSRApp(App);
};
```

接着为客户端和服务端分别编写两套webpack配置文件：

- base用于设置基本规则

- webpack.client.js用于定义构建客户端资源的配置：
  ````javascript
  // webpack.client.js
  const Merge = require("webpack-merge");
  const path = require("path");
  const HtmlWebpackPlugin = require("html-webpack-plugin");
  const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
  const base = require("./webpack.base");
  
  // 继承自 `webpack.base.js`
  module.exports = Merge.merge(base, {
    mode: "development",
    entry: {
      // 入口指向 `entry-client.js` 文件
      client: path.join(__dirname, "./src/entry-client.js"),
    },
    output: {
      publicPath: "/",
    },
    module: {
      rules: [{ test: /\.css$/, use: ["style-loader", "css-loader"] }],
    },
    plugins: [
      // 这里使用 webpack-manifest-plugin 记录产物分布情况
      // 方面后续在 `server.js` 中使用
      new WebpackManifestPlugin({ fileName: "manifest-client.json" }),
      // 自动生成 HTML 文件内容
      new HtmlWebpackPlugin({
        templateContent: `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Webpack App</title>
  </head>
  <body>
    <div id="app" />
  </body>
  </html>
    `,
      }),
    ],
  });
  ````

- webpack.sever.js应用于服务端的webpack配置:
  ```js
  // webpack.server.js
  const Merge = require("webpack-merge");
  const path = require("path");
  const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
  const base = require("./webpack.base");
  
  module.exports = Merge.merge(base, {
    entry: {
      server: path.join(__dirname, "src/entry-server.js"),
    },
    target: "node",
    output: {
      // 打包后的结果会在 node 环境使用
      // 因此此处将模块化语句转译为 commonjs 形式
      libraryTarget: "commonjs2",
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            // 注意，这里用 `vue-style-loader` 而不是 `style-loader`
            // 因为 `vue-style-loader` 对 SSR 模式更友好
            "vue-style-loader",
            {
              loader: "css-loader",
              options: {
                esModule: false,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      // 这里使用 webpack-manifest-plugin 记录产物分布情况
      // 方面后续在 `server.js` 中使用
      new WebpackManifestPlugin({ fileName: "manifest-server.json" }),
    ],
  });
  ```

至此，我们只需要通过两行不同的命令可以分别生成客户端和服务端版本的代码：
```js
# 客户端版本：
npx webpack --config ./webpack.client.js
# 服务端版本：
npx webpack --config ./webpack.server.js 
```

再是编写Node应用代码server.js,此处有基础功能即可：
```js
// server.js
const express = require("express");
const path = require("path");
const { renderToString } = require("@vue/server-renderer");

// 通过 manifest 文件，找到正确的产物路径
const clientManifest = require("./dist/manifest-client.json");
const serverManifest = require("./dist/manifest-server.json");
const serverBundle = path.join(
  __dirname,
  "./dist",
  serverManifest["server.js"]
);
// 这里就对标到 `entry-server.js` 导出的工厂函数
const createApp = require(serverBundle).default;

const server = express();

server.get("/", async (req, res) => {
  const app = createApp();

  const html = await renderToString(app);
  const clientBundle = clientManifest["client.js"];
  res.send(`
<!DOCTYPE html>
<html>
    <head>
      <title>Vue SSR Example</title>
    </head>
    <body>
      <!-- 注入组件运行结果 -->
      <div id="app">${html}</div>
      <!-- 注入客户端代码产物路径 -->
      <!-- 实现 Hydrate 效果 -->
      <script src="${clientBundle}"></script>
    </body>
</html>
    `);
});

server.use(express.static("./dist"));

server.listen(3000, () => {
  console.log("ready");
});
```

它的核心逻辑：

- 调用enter-server.js导出的工厂函数渲染出vue组件结构
- 调用@vue/server-renderer将组件渲染为HTML字符串
- 拼接HTML内容，将组件HTML字符串与entry-client.js产物路径注入到HTML中，并返回给客户端

至此，一个基本的SSR架构搭建完成，接着就可以编写vue代码













