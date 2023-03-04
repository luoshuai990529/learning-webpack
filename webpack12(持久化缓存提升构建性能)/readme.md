# Webpack持久化缓存提升构建性能

Webpack5的 [持久化缓存](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Fcache%2F%23cache) 是最令人振奋的特性之一，它可以将首次构建的过程和结果数据持久化保存到本地文件系统，在下次执行构建时跳过解析、链接、编译等一系列非常消耗性能的操作，直接复用上次的Module/ModuleGraph/Chunk对象数据，迅速构建出最终产物。

持久化缓存的性能提升效果非常初中，以Three.js为例，一份包含362份JS文件，约3W行代码(中大型项目)，配置`babel-loader`、`eslint-loder`后，未使用`cache`特性时构建性能耗时约在11000ms到18000ms之间；启动`cache`功能后，第二次构建耗时降低到500ms到800ms之间，近50倍的优化提升。而此提升仅仅需要在webpack5中设置`cache.type = 'filesystem'`即可开启：
```javascript
module.exports = {
    //...
    cache: {
        type: 'filesystem'
    },
    //...
};
```

此外，`cache`还提供了若干用于配置缓存效果、缓存周期的配置项，包括：

- `cache.type`：缓存类型，支持`'memory' | 'filesystem'`,需要设置为`filesystem`才能开启持久化缓存；

- `cache.cacheDirectory`：缓存文件路径，默认为`node_modules/.cache/webpack`；

- `cache.buildDependencies`：额外的依赖文件，当这些文件内容发生变化时，缓存会完全失效而执行完整的编译构建，通常可以设置为各种配置文件，如：

  ```javascript
  module.exports = {
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [
          path.join(__dirname, 'webpack.dll_config.js'),
          path.join(__dirname, '.babelrc')
        ],
      },
    },
  };
  ```

- `cache.manageaPaths`：受控目录，Webpack构建时会跳过新旧代码哈希值与时间戳的对比，直接使用缓存副本，默认值为`['./node_modules']`;

- `cache.profile`：是否输出缓存处理过程的详细日志，默认`false`；

- `cache.maxAge`：缓存失效时间，默认为5184000000。

通常使用时关注上述配置项即可，其他的`idleTimeout`、`idleTimeoutAfterLargeChanges`等都喝Webpack内部实现算法有关，与缓存关系不大。

### 缓存原理

Webpack5会将首次构建出的Module、Chunk、ModuleGraph等对象序列化之后保存到硬盘中，后面再运行的时候，就可以跳过许多耗时的编译动作，直接复用缓存数据。

我们已经直到Webapck的构建阶段大致分为三个：

- 初始化：主要根据配置信息设置内置的各类插件。
- Make-构建阶段，从`entry`模块开始，执行：
  - 读入文件内容；
  - 调用Loader转译文件内容；
  - 调用acorn生成AST结构；
  - 分析AST，确定模块的依赖列表；
  - 遍历模块依赖列表，对每一个依赖模块重新执行上述流程，直到完整的模块依赖图——ModuleGraph对象；
- 封装阶段Seal：
  - 遍历模块依赖图，对每一个模块执行：代码转译，如`import => require`;分析运行时依赖。
  - 合并模块代码和运行时代码，生成Chunk；
  - 执行产物优化操作，如Tree-shaking、terser、codesplit；
  - 输出产物文件。

过程中有许多的CPU密集型操作，如调用Loader链加载文件时，遇到babel-loader、eslint-loader等工具时可能要重复生成AST；分析模块依赖时则需要遍历AST，执行大量运算；封装Seal阶段也同样存在大量AST遍历，以及代码转换、优化操作，等等。而持久化缓存的功能将构建结果保存到文件系统中，在下一次编译时对比每一个文件的**内容哈希**或者**时间戳**，未发生变化的文件跳过编译操作，直接使用缓存副本，减少重复计算；发生变更的模块则重新执行编译流程。

![image-20230304185448507](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230304185448507.png)

如图，它在首次构建完毕后，将Module、Chunks、ModuleGraph三类对象的状态序列化并记录到缓存文件中；在下次开始构建时，尝试读入并恢复这些对象的状态，从而跳过执行Loader链、解析AST、解析依赖耗时等操作，提升编译性能。

### Webpack4中如何使用持久化缓存

Webpack5中的持久化缓存用法简单，而在webpack4中以及之前的版本还没有相关的实现，只能借助一些第三方库实现类似效果(`cache-loader`)：

- 使用 `[cache-loader](https://www.npmjs.com/package/cache-loader)`；
- 使用 `[hard-source-webpack-plugin](https://github.com/mzgoddard/hard-source-webpack-plugin)`；
- 使用 Loader（如 `babel-loader`、`eslint-loader`)）自带的缓存能力。

#### 使用`cache-loader`

它能够将Loader处理结果保存到硬盘，下次运行时若文件内容没有发生变化则直接返回缓存结果：

1. 安装依赖：
   ```powershell
   yarn add -D cache-loader
   ```

2. 添加配置：
   ```javascript
   const HardSourceWebpackPlugin = require("hard-source-webpack-plugin");
   
   module.exports = {
   	plugins: [
   		new HardSourceWebpackPlugin()
   	]
   }
   ```

   首次运行时，`hard-source-webpack-plugin`会缓存在文件夹`node_module/.cache`写入一系列日志文件：
   <img src="https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230304190456242.png" alt="image-20230304190456242" style="zoom:50%;" />

   下次运行时，该插件会复用缓存中记录的数据，跳过一系列构建步骤，从而提升构建性能。它的底层逻辑和Webapck5的持久化缓存相似，但是优化效果稍微差一些。

### 使用组件自带的缓存功能

除了使用`cache-loader hard-source-webpack-plugin`方案之外，还可以使用Webpack组件自带的缓存能力提升特定领域的编译性能，这一类组建有：

- babel-loader;
- eslint-loader:旧版本 ESLint Webpack 组件，官方推荐使用 [eslint-webpack-plugin](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Feslint-webpack-plugin) 代替；
- eslint-webpack-plugin
- stylelint-webpack-plugin

如使用`babel-loader`：
```javascript
module.exports = {
    // ...
    module: {
        rules: [{
            test: /\.m?js$/,
            loader: 'babel-loader',
            options: {
                cacheDirectory: true,
            },
        }]
    },
    // ...
};
```

默认情况下，缓存内容会被保存到`node_modules/.cache/babel-loader`目录，你也可以通过`cacheDirectory = 'dir'`属性设置缓存路径。

其他的一些，Eslint和Stylelint这一类耗时较长的Lint工具也提供了缓存能力，如：
```javascript
// webpack.config.js
module.exports = {
  plugins: [
    new ESLintPlugin({ cache: true }),
    new StylelintPlugin({ files: '**/*.css', cache: true }),
  ],
};
```





