### 1.借助 Bable + TS + ESLint 构建现代JS工程环境

webpack场景下处理JS的三种常用工具：Bable、Typescript、ESLint。

#### 使用Bable

为了ES6(ECMAScript 6.0)版本带来的各种新特性在浏览器、Node等JS引擎中得到兼容，现代Web开发流程中通常会引入Babel等转译工具。如：

```javascript
// 使用 Babel 转译前
arr.map(item => item + 1)

// 转译后
arr.map(function (item){
  return item + 1;
})
```

Webpack 场景下只需要使用`babel-loader`就可以接入Babel的转译功能：
```javascript
// 1-安装依赖
npm i -D @babel/core @babel/preset-env babel-loader
```

```javascript
// 2-添加模块处理规则
module.exports = {
  /* ... */
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
      },
    ],
  },
};
```

这里的`@bable/preset-env`是一种Babel预设规则集——Preset，这种设计能按需将一系列复杂的配置、插件等打包成单一的资源包，从而简化Babel的应用、学习成本。Preset是Babel的主要应用方式之一，社区也针对不同的场景打爆了各种Preset资源：

- [`babel-preset-react`](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fbabel-preset-react)：包含 React 常用插件的规则集，支持 `preset-flow`、`syntax-jsx`、`transform-react-jsx` 等；
- [`@babel/preset-typescript`](https://link.juejin.cn/?target=https%3A%2F%2Fbabeljs.io%2Fdocs%2Fen%2Fbabel-preset-typescript)：用于转译 TypeScript 代码的规则集
- [`@babel/preset-flow`](https://link.juejin.cn/?target=https%3A%2F%2Fbabeljs.io%2Fdocs%2Fen%2Fbabel-preset-flow%2F)：用于转译 [Flow](https://link.juejin.cn/?target=https%3A%2F%2Fflow.org%2Fen%2Fdocs%2Fgetting-started%2F) 代码的规则集

> Babel 官网：[What is Babel? · Babel (babeljs.io)](https://babeljs.io/docs/en/)



#### 使用TypeScript

webpack有很多种接入Typescript的方法，包括了`ts-loader`、`awesome-ts-loader`、`babel-loader`。通常可使用`ts-loader`构建TS代码：
```javascript
// 1- 安装依赖
npm i -D typescript ts-loader
```

```javascript
// 2-配置Webpack
const path = require('path');

module.exports = {
  /* xxx */
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader'
      },
    ],
  },
  resolve: {
    // 自动解析.ts后缀文件，这意味着如 import "./a.ts" 可以简化为 import "./a" 文件
    extensions: ['.ts', '.js'],
  }
};
```

```javascript
// 3-创建tsconfig.json 文件，补充typescript配置信息
// tsconfig.json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "moduleResolution": "node"
  }
}
```

最后执行编译：

```javascript
npx webpack
```

**注意如果项目中已经使用了 babel-loader,可以选择使用 `@babel/preset-typescript`规则集，借助`babel-loader`完成 Javascript 与 Typescript的转码工作**：

```javascript
// 1-安装依赖
npm i -D @babel/preset-typescript
```

```javascript
// 2-配置Webpack
// 预先安装 @babel/preset-env
// npm i -D @babel/preset-env
module.exports = {
  /* ... */
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-typescript'],
            },
          },
        ],
      },
    ],
  },
};
```

> 注意：`@babel/preset-typescript` 只是简单完成代码转换，并未做类似 `ts-loader` 的类型检查工作，大家需要根据实际场景选择适当工具。
>
> 在以前(Babel7之前)的编译顺序是：TS > TS编译器 > JS > Babel编译器 > JS
>
> 补充：**`@babel/preset-typescript`**是直接移除TS 转为 JS，使得其编译速度飞快，并且只需要管理Bable一个编译器就行了，但是他没了类型检测那么该如何办？
>
> 方案1：我们可以使用ESLint，用@typescript-eslint配置ESLint来达到检测的目的。
> 方案2：通过VSCode 自带TS检测实现



#### 使用ESLint

Webpack 下，可以使用 `eslint-webpack-plugin` 接入 ESLint 工具，步骤：

1-安装依赖

```javascript
// 安装webpack依赖
yarn add -D webpack webpack-cli

// 安装 eslint
yarn add -D eslint eslint-webpack-plugin

// 简单起见直接使用 standard规范：
yarn add -D eslint-config-standard eslint-plugin-promise eslint-plugin-import eslint-plugin-node eslint-plugin-n
```

2-在项目根目录添加 `.eslintrc` 配置文件，配置如下内容：

```javascript
// .eslintrc 
{
	"extends": "standard"
}
```

3-添加 `webpack.config.js` 配置文件，补充 `eslint-webpack-plugin` 配置:

```javascript
// webpack.config.js
const path = require('path')
const ESLintPlugin = require('eslint-webpack-plugin')

module.exports = {
  entry: './src/index',
  mode: 'development',
  devtool: false,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  // 添加 eslint-webpack-plugin 插件实例
  plugins: [new ESLintPlugin()]
}
```

4-执行编译：

```javascript
npx webpack
```

配置完毕后既可以在Webpack编译过程中看到代码风格错误提示了，除了常规javascript代码风格检查，我们还可以使用适当的ESLint插件、配置更多功能，如一些第三方扩展：

- [`eslint-config-airbnb`](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fairbnb%2Fjavascript%2Ftree%2Fmaster%2Fpackages%2Feslint-config-airbnb)：Airbnb 提供的代码风格规则集，算得上 ESLint 生态第一个成名的规则集合
- [`eslint-config-standard`](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fstandard%2Feslint-config-standard)：[Standard.js](https://link.juejin.cn/?target=https%3A%2F%2Fstandardjs.com%2F) 代码风格规则集，史上最便捷的统一代码风格的方式
- [`eslint-plugin-vue`](https://link.juejin.cn/?target=https%3A%2F%2Feslint.vuejs.org%2F)：实现对 Vue SFC 文件的代码风格检查
- [`eslint-plugin-react`](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Feslint-plugin-react)：实现对 React 代码风格检查
- [`@typescript-eslint/eslint-plugin`](https://link.juejin.cn/?target=https%3A%2F%2Ftypescript-eslint.io%2Fdocs%2Fdevelopment%2Farchitecture%2Fpackages%2F)：实现对 TypeScript 代码风格检查
- [`eslint-plugin-sonarjs`](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2FSonarSource%2Feslint-plugin-sonarjs)：基于 `Sonar` 的代码质量检查工具，提供圈复杂度、代码重复率等检测功能

#### 小结

串联上述三种工具，构建一套功能完备的javascript应用开发环境，步骤：

1.安装基础依赖

```javascript
npm i -D webpack webpack-cli \
// babel 依赖
@babel/core @babel/cli @babel/preset-env babel-loader \
// TypeScript 依赖
typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin \
@babel/preset-typescript \
// ESLint 依赖
eslint eslint-webpack-plugin
```

2.创建`webpack.config.js`配置文件并输入

```js
const path = require('path')
const ESLintPlugin = require('eslint-webpack-plugin')

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: false,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-typescript'] }
        }
      }
    ]
  },
  plugins: [new ESLintPlugin({ extensions: ['.js', '.ts'] })]
}
```

3.创建`.eslintrc`文件并输入

```javascript
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["plugin:@typescript-eslint/recommended"]
}
```

4.最后执行命令打包

```
npx webpack
```



