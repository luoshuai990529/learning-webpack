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

















