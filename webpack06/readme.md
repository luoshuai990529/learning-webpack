# 开发一个NPM库

webpack构建NPM库时需要注意：

- 正确导出模块内容
- 不要将第三方包打包进产物中，以免与业务环境发生冲突
- 将CSS抽离为独立文件，以方便用户自行决定实际用法
- 始终生成Sourcemap文件，方便用户调试

虽然NPM库和普通Web应用在形态上有些区别，但是大体的编译需求趋同，webpack基础编译配置：
```javascript
// webpack.config.js
const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "./dist"),
  }
};
```

> 提示：我们还可以在上例基础上叠加任意 Loader、Plugin，例如： `babel-loader`、`eslint-loader`、`ts-loader` 等。

上述配置会将代码编译成一个IIFE函数，但这并不适用于NPM库，我们需要修改`output.library`配置，以适当方式导出模块内容：
```javascript
module.exports = {
  // ...
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "./dist"),
+   library: {
+     name: "_",
+     type: "umd",
+   },
  },
  // ...
};
```

- [output.library.name](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputlibraryname)：用于定义模块名称，在浏览器环境下使用 `script` 加载该库时，可直接使用这个名字调用模块，例如：

  ```html
  <!DOCTYPE html>
  <html lang="en">
  ...
  <body>
      <script src="https://examples.com/dist/main.js"></script>
      <script>
          // Webpack 会将模块直接挂载到全局对象上
          window._.add(1, 2)
      </script>
  </body>
  
  </html>
  ```

- [output.library.type](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputlibrarytype)：用于编译产物的模块化方案，可选值有：`commonjs`、`umd`、`module`、`jsonp` 等，**通常选用兼容性更强的 `umd` 方案即可**。

  > 提示：JS最开始没有模块化方案，这就导致早期Web开发需要将许多代码写进同一文件，极度影响开发效率。然后随着Web应用复杂度提高，就出现了适用于不同场景的模块化规范，如：CommonJS、UMD、CMD、AMD，以及ES6的ES Module，NPM库作者需要根据预期的使用场景选择适当方案。

当我们选择了`UMD`模式时，代码打包后也会被包装成UMD模式：
```javascript
(function webpackUniversalModuleDefinition(root, factory) {
    if(typeof exports === 'object' && typeof module === 'object')
        module.exports = factory();
    else if(typeof define === 'function' && define.amd)
        define([], factory);
    else if(typeof exports === 'object')
        exports["_"] = factory();
    else
        root["_"] = factory();
})(self, function() {
 // ...
});
```

这种形态会在NPM库启动时判断运行环境，自动选择当前适用的模块化方案，伺候我们就可以在各种场景下使用`test-lib`库了：

```javascript
// ES Module
import {add} from 'test-lib';

// CommonJS
const {add} = require('test-lib');

// HTML
<script src="https://examples.com/dist/main.js"></script>
<script>
    // Webpack 会将模块直接挂载到全局对象上
    window._.add(1, 2)
</script>
```

# 正确使用第三方包

如果我们需要在`test-lib`中使用其他的NPM包，如lodash：
```javascript
// src/index.js
import _ from "lodash";

export const add = (a, b) => a + b;

export const max = _.max;
```

此时执行编译命令`npx webpack`，我们会发现产物文件的体积非常大,因为Webpack默认会将所有的第三方依赖都打包进产物中，这种逻辑能满足Web应用资源合并需求，但在开发NPM库时则很可能导致代码冗余。以`test-lib`为例，若使用者在业务项目中已安装并使用了`lodash`,那么最终产物必然会包含两份`lodash`代码。

如何解决？
我们需要用到 [externals](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Fexternals%2F) 配置项，将第三方依赖排除在打包系统之外:

```
// webpack.config.js
module.exports = {
  // ...
+  externals: {
+   lodash: {
+     commonjs: "lodash",
+     commonjs2: "lodash",
+     amd: "lodash",
+     root: "_",
+   },
+ },
  // ...
};
```

> 提示： Webpack 编译过程会跳过 [externals](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Fexternals%2F) 所声明的库，并假定消费场景已经安装了相关依赖，常用于 NPM 库开发场景；在 Web 应用场景下则常被用于优化性能。
> 例如，我们可以将 React 声明为外部依赖，并在页面中通过 `<script>` 标签方式引入 React 库，之后 Webpack 就可以跳过 React 代码，提升编译性能。

改造之后再运行`npx webpack` 的变化：

1. 产物仅包含 `test-lib` 库代码，体积相比修改前大幅降低；
2. UMD 模板通过 `require`、`define` 函数中引入 `lodash` 依赖并传递到 `factory`。

此时，webpack不再打包lodash代码，我们可以将其声明为`peerDependencies`，作用：

1. 要求项目拥有`peerDependencies`所指定的环境依赖, 完成子环境要求父环境具有某些依赖包
2. 提升项目(插件)依赖
3. 减少重复安装依赖

实践中，多数第三方框架都可以沿用上例方式处理，包括 React、Vue、Angular、Axios、Lodash 等，方便起见，可以直接使用 [webpack-node-externals](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fwebpack-node-externals) 排除所有 `node_modules` 模块，使用方法：
```
// webpack.config.js
const nodeExternals = require('webpack-node-externals');

module.exports = {
  // ...
+  externals: [nodeExternals()]
  // ...
};
```













