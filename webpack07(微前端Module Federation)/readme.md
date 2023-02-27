# Webpack构建微前端应用

> Module Federation 通常译作“**模块联邦**”，是 Webpack 5 新引入的一种远程模块动态加载、运行技术。MF 允许我们将原本单个巨大应用按我们理想的方式拆分成多个体积更小、职责更内聚的小应用形式，理想情况下各个应用能够实现独立部署、独立开发(不同应用甚至允许使用不同技术栈)、团队自治，从而降低系统与团队协作的复杂度 —— 没错，这正是所谓的微前端架构。
>
> *An architectural style where independently deliverable frontend applications are composed into a greater whole —— 摘自《**[Micro Frontends](https://link.juejin.cn/?target=https%3A%2F%2Fmartinfowler.com%2Farticles%2Fmicro-frontends.html)**》。*

MF的一些特性：

- 应用可以按需导出若干模块，这些模块最终会被单独打包成模块包，功能上有点像NPM模块；
- 应用可在运行时基于HTTP(S)协议动态加载其他应用暴露的模块，且用法与动态加载普通NPM模块一样简单；
- 与其他微前端方案不同,MF的应用之间关系平等，没有主应用/子应用之分，每个应用都能导出/导入任意模块；

# 示例

Module Federation 的基本逻辑是一端导出模块，另一端导入、使用模块，实现上两端都是依赖于webpack 5内置的 `ModuleFederationPlugin`插件：

1. 对于模块生成方，需要使用 `ModuleFederationPlugin` 插件的 `expose` 参数声明需要导出的模块列表；
2. 对于模块使用方，需要使用 `ModuleFederationPlugin` 插件的 `remotes` 参数声明需要从哪些地方导入远程模块。

模块导出方 app-1 的配置：
```javascript
const path = require("path");
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  mode: "development",
  devtool: false,
  entry: path.resolve(__dirname, "./src/main.js"),
  output: {
    path: path.resolve(__dirname, "./dist"),
    // 必须指定产物的完整路径，否则使用方无法正确加载产物资源
    publicPath: `http://localhost:8081/dist/`,
  },
  plugins: [
    new ModuleFederationPlugin({
      // MF 应用名称
      name: "app1",
      // MF 模块入口，可以理解为该应用的资源清单
      filename: `remoteEntry.js`,
      // 定义应用导出哪些模块
      exposes: {
        "./utils": "./src/utils",
        "./foo": "./src/foo",
      },
    }),
  ],
  // MF 应用资源提供方必须以 http(s) 形式提供服务
  // 所以这里需要使用 devServer 提供 http(s) server 能力
  devServer: {
    port: 8081,
    hot: true,
  },
};
```

使用了该`ModuleFederationPlugin` 插件后，Webpack会将`exposes`声明的模块分别编译为独立产物，并将产物清单、MF运行时代码打包进`filename`定义的**应用入口文件(Remote Entry File)**,如上述`app-1`经过Webpack编译后，将产生如下产物：
```css
MF-basic
├─ app-1
│  ├─ dist
│  │  ├─ main.js
│  │  ├─ remoteEntry.js
│  │  ├─ src_foo_js.js
│  │  └─ src_utils_js.js
│  ├─ src
│  │  ├─ ...
```

- `main.js`为整个应用编译的结果，此处可忽略；
- `src_utils_js.js`与`src_foo_js.js`分别为`exposes`声明的模块的编译产物;
- `remoteEntry.js`是`ModuleFederationPlugin`插件生成的应用入口文件，包含清单、MF运行时代码。

接着是`app-2`的配置方式：
```javascript
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  mode: "development",
  devtool: false,
  entry: path.resolve(__dirname, "./src/main.js"),
  output: {
    path: path.resolve(__dirname, "./dist"),
  },
  plugins: [
    // 模块使用方也依然使用 ModuleFederationPlugin 插件搭建 MF 环境
    new ModuleFederationPlugin({
      // 使用 remotes 属性声明远程模块列表
      remotes: {
        // 地址需要指向导出方生成的应用入口文件
        RemoteApp: "app1@http://localhost:8081/dist/remoteEntry.js",
      },
    }),
    new HtmlWebpackPlugin(),
  ],
  devServer: {
    port: 8082,
    hot: true,
    open: true,
  },
};
```

作用远程模块使用方，`app-2` 需要使用 `ModuleFederationPlugin` 声明远程模块的 HTTP(S) 地址与模块名称(示例中的 `RemoteApp`)，之后在 `app-2` 中就可以使用模块名称异步导入 `app-1` 暴露出来的模块，如：
```javascript
// app-2/src/main.js
(async () => {
  const { sayHello } = await import("RemoteApp/utils");
  sayHello();
})();
```

总结一下，MF 中的模块导出/导入方都依赖于 `ModuleFederationPlugin` 插件，其中导出方需要使用插件的 `exposes` 项声明导出哪些模块，使用 `filename` 指定生成的入口文件；导入方需要使用 `remotes` 声明远程模块地址，之后在代码中使用异步导入语法 `import("module")` 引入模块。

这种模块远程加载、运行的能力，搭配适当的 DevOps 手段，已经足以满足微前端的独立部署、独立维护、开发隔离的要求，在此基础上 MF 还提供了一套简单的依赖共享功能，用于解决多应用间基础库管理问题。

# 依赖共享

上例应用互相独立，各自管理，打包基础依赖包，实际项目中通常存在一部分公共依赖——如Vue、React、Lodash等，如果简单沿用上例这种分开打包的方式势必会出现依赖被重复打包，造成产物冗余的问题，为此`ModuleFederationPlugin`提供了`shared`配置用于声明该应用可以被共享的依赖模块。

如上述 `app-1`配置添加`shared`配置：
```javascript
module.exports = {
  // ...
  plugins: [
    new ModuleFederationPlugin({
      name: "app1",
      filename: `remoteEntry.js`,
      exposes: {
        "./utils": "./src/utils",
        "./foo": "./src/foo",
      }, 
      // 可被共享的依赖模块
     shared: ['lodash']
    }),
  ],
  // ...
};
```

接着给`app-2`添加相同的`share`配置：
```javascript
module.exports = {
  // ...
  plugins: [
    // 模块使用方也依然使用 ModuleFederationPlugin 插件搭建 MF 环境
    new ModuleFederationPlugin({
      // 使用 remotes 属性声明远程模块列表
      remotes: {
        // 地址需要指向导出方生成的应用入口文件
        RemoteApp: "app1@http://localhost:8081/dist/remoteEntry.js",
      },
     shared: ['lodash']
    }),
    new HtmlWebpackPlugin(),
  ],
  // ...
};
```

之后，运行页面可以看到最终只加载了一次 `lodash` 产物(下表左图)，而改动前则需要分别从导入/导出方各加载一次 `lodash`(下表右图)：
![image-20230112193833159](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230112193833159.png)

注意，这里要求两个应用使用 **版本号完全相同** 的依赖才能被复用，假设上例应用 `app-1` 用了 `lodash@4.17.0` ，而 `app-2` 用的是 `lodash@4.17.1`，Webpack 还是会同时加载两份 lodash 代码，我们可以通过 `shared.[lib].requiredVersion` 配置项显式声明应用需要的依赖库版本来解决这个问题：

```javascript
module.exports = {
  // ...
  plugins: [
    new ModuleFederationPlugin({
      // ...
      // 共享依赖及版本要求声明
     shared: {
       lodash: {
         requiredVersion: "^4.17.0",
       },
     },
    }),
  ],
  // ...
};
```

上例 `requiredVersion: "^4.17.0"` 表示该应用支持共享版本大于等于 `4.17.0` 小于等于 `4.18.0` 的 lodash，其它应用所使用的 lodash 版本号只要在这一范围内即可复用。`requiredVersion` 支持 [Semantic Versioning 2.0](https://link.juejin.cn/?target=https%3A%2F%2Fsemver.org%2F) 标准，这意味着我们可以复用 `package.json` 中声明版本依赖的方法。

`requiredVersion` 的作用在于限制依赖版本的上下限，实用性极高。除此之外，我们还可以通过 `shared.[lib].shareScope` 属性更精细地控制依赖的共享范围，例如：

```javascript
module.exports = {
  // ...
  plugins: [
    new ModuleFederationPlugin({
      // ...
      // 共享依赖及版本要求声明
     shared: {
       lodash: {
         // 任意字符串
         shareScope: 'foo'
       },
     },
    }),
  ],
  // ...
};
```

在这种配置下，其它应用所共享的 lodash 库必须同样声明为 `foo` 空间才能复用。`shareScope` 在多团队协作时能够切分出多个资源共享空间，降低依赖冲突的概率。

除 `requiredVersion`/`shareScope` 外，`shared` 还提供了一些不太常用的 [配置](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fplugins%2Fmodule-federation-plugin%2F)，简单介绍：

- `singletong`：强制约束多个版本之间共用同一个依赖包，如果依赖包不满足版本 `requiredVersion` 版本要求则报警告：
  ![image-20230112194116269](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230112194116269.png)

- `version`：声明依赖包版本，缺省默认会从包体的 `package.json` 的 `version` 字段解析；
- `packageName`：用于从描述文件中确定所需版本的包名称，仅当无法从请求中自动确定包名称时才需要这样做；
- `eager`：允许 webpack 直接打包该依赖库 —— 而不是通过异步请求获取库；
- `import`：声明如何导入该模块，默认为 shared 属性名，实用性不高，可忽略。

# 实践应用

[luoshuai990529/react-ts-micro-demo: 一个Webpack5+React+TS的多页面微前端应用架构 DEMO (github.com)](https://github.com/luoshuai990529/react-ts-micro-demo)