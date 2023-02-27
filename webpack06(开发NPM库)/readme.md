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

# 抽离CSS

如果说我们开发的NPM 库中包含了CSS代码，如我们平时开发的组件库，我们通常需要使用`mini-css-extract-plugin`插件将样式抽离成单独文件，由用户自行引入。
这是因为Webpack处理CSS的方式有很多，例如使用style-loader将样式注入页面的`head`标签；使用`mini-css-extract-plugin`抽离文件样式。作为NPM库开发者，如果我们粗暴地将CSS代码打包进产物中，有可能与用户设定的方式冲突。

为此，我们需要添加`mini-css-extract-plugin`的配置：
```javascript
module.exports = {  
  // ...
+ module: {
+   rules: [
+     {
+       test: /\.css$/,
+       use: [MiniCssExtractPlugin.loader, "css-loader"],
+     },
+   ],
+ },
+ plugins: [new MiniCssExtractPlugin()],
};
```

> 补充知识：
>
> 1. 关于浏览器如何处理`href`资源和`src`资源(为什么加载css用link，而加载js用script)
>    <link href="style.css" rel="stylesheet" />
>
>    **当浏览器遇到link元素时，会把他理解成一种样式表资源，并且会继续解析HTML页面，不会阻塞**(不过，渲染可能会被暂停，因为浏览器需要时间解析样式规则然后渲染到页面)，这和直接把CSS的内容放到`style`里是不同的(因此，使用`link`的方式比使用`@import`的方式更明智)
>
>    (注：@import是CSS中引入另一个CSS文件的方式，相当于把内容复制过来替换掉@import语句)
>
>    <script src="script.js"></script>
>
>    **当浏览器遇到`script`元素，浏览器加载页面的过程会阻塞**，直到浏览器拿到，编译并执行了文件，这和直接把文件的内容放到`script`标签是一样的。`img`的src属性也是类似，img元素是一个空元素，里面具体放什么内容，取决于`src`属性的定义，浏览器会暂停加载，直到拿到并加载完图片.（`iframe`元素也是一样的情况）
>
> 2. JS执行会阻塞DOM树的解析和渲染，那么CSS加载会阻塞DOM树的解析和渲染吗？
>
>    **CSS的加载并不会阻塞DOM树的解析，但它会阻塞DOM树的渲染**
>    （why：这可能也是浏览器的一种优化机制，因为在加载CSS的时候，可能会修改下面DOM节点的样式，如果CSS加载不阻塞DOM树的渲染的话，那么CSS加载完之后，DOM树可能又得重绘或者回流，就会造成不必要的性能损耗）。
>
> 3. CSS加载会阻塞JS运行吗？
>
>    **CSS加载会阻塞后面的JS语句执行**，如下列代码示例，CSS加载语句后的JS代码迟迟没有执行，知道css加载完成它才执行：
>
>    ```
>    <!DOCTYPE html>
>    <html lang="en">
>      <head>
>        <title>css阻塞</title>
>        <meta charset="UTF-8">
>        <meta name="viewport" content="width=device-width, initial-scale=1">
>        <script>
>          console.log('before css')
>          var startDate = new Date()
>        </script>
>        <link href="https://cdn.bootcss.com/bootstrap/4.0.0-alpha.6/css/bootstrap.css" rel="stylesheet">
>      </head>
>      <body>
>        <h1>这是红色的</h1>
>        <script>
>          var endDate = new Date()
>          console.log('after css')
>          console.log('经过了' + (endDate -startDate) + 'ms')
>        </script>
>      </body>
>    </html>
>    ```
>
>    补充：没有JS的理想情况下，HTML和CSS会并行解析，分别生成DOM和CSSOM，然后合并成Render Tree；但是如果有JS，CSS加载会阻塞后面JS语句的执行，而同步JS脚本执行会阻塞其后的DOM解析(所以通常把css放头部，js放在body末尾)
>    **p.s. 不严谨的说，某些情况下css会因为js脚本间接阻塞DOM解析**
>
> 4. 外链CSS还是内嵌？
>    独立外链CSS的好处：
>
>    - 便于复用：将样式与html结构分开，当某个页面需要某个样式时，直接引入相关文件即可
>    - 便于管理：保持html文档结构的整洁，不会混淆
>    - 可以被浏览器缓存，减少下一次访问时间
>
>    缺点：
>
>    - 额外的http请求：如果是内嵌style，则加载网页的时候就能加载到样式；如果css是独立的，则网页需要再开一个连接到css文件。(不过少数的几个CSS请求其实相对于那些图片发出的请求是微不足道的)
>    - 造成CSS浪费：如果我只想浏览A网页，A网页的所有CSS都在 a.css 文件中，而此文件还包含了其他网页的样式，那么就会造成css资源浪费
>    - 可能链接错误：网页加载出来了但是没有CSS样式，因为css是独立的，如果说CSS加载失败就会导致网页没有样式，如果样式是写在页面中就不会有这种问题了。
>
>    style 与 link CSS区别：
>
>    - 渲染方面：style 样式时使用HTML进行解析是异步的，**不会阻塞浏览器渲染，不会阻塞Dom解析**，会一边解析一边渲染；而link css标签解析虽然不会阻塞Dom树的解析，但是会阻塞Dom树的渲染，所以必须等待它加载完成后才会渲染页面。
>    - 加载方面：因为style样式是卸载html中的，所以首次加载会更快，而link是外部链接加载相对慢一些但是浏览器可以对该文件进行缓存减少下一次访问时间。
>
>    两者使用：如果样式较少可以使用style进行更改提高加载速度，如果样式较多可以抽离一个单独的css文件。

# 生成sourceMap

SourceMap是一种代码映射协议，它能够将经过压缩、混淆、合并的代码还原未打包状态，帮助开发者在生产环境中精确定位问题发生的行列位置，所以一个成熟的NPM库除了提供兼容性足够好的编译包外，通常还需要提供SourceMap文件。

接入方法：添加适当的`devtool`配置：
```javascript
// webapck.config.js
module.export = {
	// ... 
	devtool: 'source-map'
};
```

再次执行`npx webpack` 就可以看到 `.map`后缀的映射文件：
```markdown
├─ test-lib
│  ├─ package.json
│  ├─ webpack.config.js
│  ├─ src
│  │  ├─ index.css
│  │  ├─ index.js
│  ├─ dist
│  │  ├─ main.js
│  │  ├─ main.js.map
│  │  ├─ main.css
│  │  ├─ main.css.map
```

此后，业务方只需要使用`source-map-loader`就可以将这段Sourcemap信息加载到自己的业务系统中，实现框架级别的源码调试能力。

# 其它NPM配置

至此，开发NPM库所需要的Webapck还可以用一些小技巧优化`test-lib`的项目配置，提升开发效率，包括：

- 使用`.npmignore`文件忽略不需要发布到NPM的文件；

- 在`package.json`文件中，使用`prehublishOnly`指令，在发布前自动执行编译命令，例如：
  ```javascript
  // package.json
  {
  	"name": "test-lib",
      // ...
      "scripts": {
      	"prepublishOnly": "webpack --mode=production"
      }
      // ...
  }
  ```

- 在`package.json`文件中，使用`main`指定项目入口，同时使用`module`指定ES Module模式下的入口，以允许用户直接使用源码版本，例如：
  ```javascript
  {
  	"name": "webpack06_test-lib",
  	// ...
  	"main": "dist/main.js",
  	"module": "src/index.js",
  	"scripts": {
  		"prepublishOnly": "webpack --mode=production"
  	}
  	// ...
  }
  ```

# 总结

构建Web应用的Webpack配置和构建NPM库的差异并不大，开发时注意：

- 使用 `output.library` 配置项，正确导出模块内容；
- 使用 `externals` 配置项，忽略第三方库；
- 使用 `mini-css-extract-plugin` 单独打包 CSS 样式代码；
- 使用 `devtool` 配置项生成 Sourcemap 文件，这里推荐使用 `devtool = 'source-map'`













