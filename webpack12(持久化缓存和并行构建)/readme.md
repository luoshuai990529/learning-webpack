# Webpack持久化缓存和并行构建

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

### 并行构建

受限于Node.js的单线程架构，原生Webpack对所有资源文件做的所有解析、转译、合并操作本质上都是在同一个线程内穿行执行，CPU利用率极低，因此社区出现了一些以多进程方式运行Webpack的工具：

- [HappyPack](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Famireh%2Fhappypack)：多进程方式运行资源加载(Loader)逻辑；
- [Thread-loader](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Floaders%2Fthread-loader%2F)：Webpack 官方出品，同样以多进程方式运行资源加载逻辑；
- [Parallel-Webpack](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fparallel-webpack)：多进程方式运行多个 Webpack 构建实例；
- [TerserWebpackPlugin](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fterser-webpack-plugin%23terseroptions)：支持多进程方式执行代码压缩、uglify 功能。

这些方案的**核心设计**都很类似：针对某种计算任务创建子进程，之后将运行所需参数通过IPC(进程通信)传递到子进程并启动计算操作，计算完毕后子进程再将结果通过IPC传递回主进程，寄宿在主进程的组件实例，再将结果提交给Webapck；

#### 使用HappyPack

[HappyPack](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Famireh%2Fhappypack) 能够将耗时的**文件加载**（Loader）操作拆散到多个子进程中并发执行，子进程执行完毕后再将结果合并回传到 Webpack 进程，从而提升构建性能。他需要同时：

- 使用 `happypack/loader` 代替原本的 Loader 序列；
- 使用 `HappyPack` 插件注入代理执行 Loader 序列的逻辑。

用法：

1. 安装依赖：
   ```powershell
   yarn add -D happypack
   ```

2. 将原有的`loader`配置替换为`happypack/loader`:
   ```javascript
   module.exports = {
     // ...
     module: {
       rules: [
         {
           test: /\.js$/,
           use: "happypack/loader",
           // 原始配置如：
           // use: [
           //  {
           //      loader: 'babel-loader',
           //      options: {
           //          presets: ['@babel/preset-env']
           //      }
           //  },
           //  'eslint-loader'
           // ]
         },
       ],
     },
   };
   ```

3. 创建`happypack`插件实例，并将原有loader配置迁移到插件中，完整配置：
   ```javascript
   const HappyPack = require('happypack');
   
   module.exports = {
   	module: {
       	rules: [
               {
               	test: /\.js$/,
                   use: 'happypack/loader'
               }
           ]
       },
       plugins: [
           new HappyPack({
             loaders: [
                 {
                 	loader: 'babel-loader',
                   option: {
                   	presets: ['@babel/preset-env'],
                   }
                 },
                 "eslint-loader",
             ]
           })
       ]
   }
   ```

   上述示例仅演示了使用HappyPack加载单一资源类型的场景，实践中我们还可以创建多个HappyPack插件实例，来加载多种资源类型——只需要用`id`参数做好Loader和Plugins实例的关联即可，如：
   ```javascript
   const HappyPack = require('happypack');
   
   module.exports = {
     // ...
     module: {
       rules: [{
           test: /\.js?$/,
           // 使用 `id` 参数标识该 Loader 对应的 HappyPack 插件示例
           use: 'happypack/loader?id=js'
         },
         {
           test: /\.less$/,
           use: 'happypack/loader?id=styles'
         },
       ]
     },
     plugins: [
       new HappyPack({
         // 注意这里要明确提供 id 属性
         id: 'js',
         loaders: ['babel-loader', 'eslint-loader']
       }),
       new HappyPack({
         id: 'styles',
         loaders: ['style-loader', 'css-loader', 'less-loader']
       })
     ]
   };
   ```

   上述重点：

   - `js`、`less` 资源都使用 `happypack/loader` 作为唯一加载器，并分别赋予 `id = 'js' | 'styles'` 参数；
   - 创建了两个 `HappyPack` 插件实例并分别配置 `id` 属性，以及用于处理 js 与 css 的 `loaders` 数组；
   - 启动后，`happypack/loader` 与 `HappyPack` 插件实例将通过 `id` 值产生关联，以此实现对不同资源执行不同 Loader 序列。

   上面这种多实例模式虽然能应对多种类型资源的加载需求，但默认情况下，HappyPack 插件实例 **自行管理** 自身所消费的进程，需要导致频繁创建、销毁进程实例 —— 这是非常昂贵的操作，反而会带来新的性能损耗。

   为此，HappyPack提供了一套简单易用的共享进程池接口（避免频繁创建、销毁进程），只需要创建`HappyPack.ThreadPool`对象，通过`size`参数指定进程总量，就可以将这个配置到每个HappyPack插件的`threadPool`属性上即可，如：
   ```javascript
   const os = require('os')
   const HappyPack = require('happypack');
   const happyThreadPool = HappyPack.ThreadPool({
     // 设置进程池大小
     size: os.cpus().length - 1
   });
   
   module.exports = {
     // ...
     plugins: [
       new HappyPack({
         id: 'js',
         // 设置共享进程池
         threadPool: happyThreadPool,
         loaders: ['babel-loader', 'eslint-loader']
       }),
       new HappyPack({
         id: 'styles',
         threadPool: happyThreadPool,
         loaders: ['style-loader', 'css-loader', 'less-loader']
       })
     ]
   };
   ```

虽然HappyPack可以有效提升打包速度，但是它又一些明显的缺点：

- 作者已经明确表示**不会继续维护**，扩展性与稳定性缺乏保障，随着 Webpack 本身的发展迭代，可以预见总有一天 HappyPack 无法完全兼容 Webpack；
- HappyPack 底层以自己的方式重新实现了加载器逻辑，源码与使用方法都不如 Thread-loader 清爽简单，而且会导致一些意想不到的**兼容性问题**，如 `awesome-typescript-loader`；
- HappyPack 主要作用于文件加载阶段，并不会影响后续的产物生成、合并、优化等功能，**性能收益有限**。

#### 使用Thread-loader

[Thread-loader](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Floaders%2Fthread-loader%2F) 与 HappyPack 功能类似，都是以多进程方式加载文件的 Webpack 组件，两者主要区别：

1. Thread-loader 由 Webpack 官方提供，目前还处于持续迭代维护状态，理论上更可靠；
2. Thread-loader 只提供了一个 Loader 组件，用法简单很多；
3. HappyPack 启动后会创建一套 Mock 上下文环境 —— 包含 `emitFile` 等接口，并传递给 Loader，因此对大多数 Loader 来说，运行在 HappyPack 与运行在 Webpack 原生环境相比没有太大差异；但 Thread-loader 并不具备这一特性，所以要求 Loader 内不能调用特定上下文接口，兼容性较差。

用法：

1. 安装依赖
   ```powershell
   yarn add -D thread-loader
   ```

2. 将 Thread-loader 放在 `use` 数组首位，确保最先运行，如：
   ```javascript
   module.exports = {
     module: {
       rules: [
         {
           test: /\.js$/,
           use: ["thread-loader", "babel-loader", "eslint-loader"],
         },
       ],
     },
   };
   ```

   启动后，Thread-loader 会在加载文件时创建新的进程，**在子进程中使用 `loader-runner` 库运行 `thread-loader` 之后的 Loader 组件**，执行完毕后再将结果回传到 Webpack 主进程，从而实现性能更佳的文件加载转译效果。

   它还提供了其他的用于控制并发逻辑的配置项：

   - `workers`：子进程总数，默认值为 `require('os').cpus() - 1`；
   - `workerParallelJobs`：单个进程中并发执行的任务数；
   - `poolTimeout`：子进程如果一直保持空闲状态，超过这个时间后会被关闭；
   - `poolRespawn`：是否允许在子进程关闭后重新创建新的子进程，一般设置为 `false` 即可；
   - `workerNodeArgs`：用于设置启动子进程时，额外附加的参数。

   使用方法跟其它 Loader 一样，都是通过 `use.options` 属性传递，如：
   ```javascript
   // Thread-loader 提供了 warmup 接口用于前置创建若干工作子进程，降低构建时延
   const threadLoader = require("thread-loader");
   
   threadLoader.warmup(
     {
       // 可传入上述 thread-loader 参数
       workers: 2,
       workerParallelJobs: 50,
     },
     [
       // 子进程中需要预加载的 node 模块
       "babel-loader",
       "babel-preset-es2015",
       "sass-loader",
     ]
   );
   
   module.exports = {
     module: {
       rules: [
         {
           test: /\.js$/,
           use: [
             {
               loader: "thread-loader",
               options: {
                 workers: 2,
                 workerParallelJobs: 50,
                 // ...
               },
             },
             "babel-loader",
             "eslint-loader",
           ],
         },
       ],
     },
   };
   ```

对比HappyPack:Thread-loader 有两个突出的优点，一是产自 Webpack 官方团队，后续有长期维护计划，稳定性有保障；二是用法更简单。它的问题：

- 在 Thread-loader 中运行的 Loader 不能调用 `emitAsset` 等接口，这会导致 `style-loader` 这一类加载器无法正常工作，解决方案是将这类组件放置在 `thread-loader` 之前，如 `['style-loader', 'thread-loader', 'css-loader']`；
- Loader 中不能获取 `compilation`、`compiler` 等实例对象，也无法获取 Webpack 配置。



#### 使用Parallel-Webpack

Thread-loader、HappyPack 这类组件所提供的并行能力都仅作用于文件加载过程，对后续 AST 解析、依赖收集、打包、优化代码等过程均没有影响，理论收益还是比较有限的。多个独立进程运行 Webpack 实例的方案 —— [Parallel-Webpack](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Ftrivago%2Fparallel-webpack)，基本用法：

1. 安装依赖：
   ```javascript
   yarn add -D parallel-webpack
   ```

2. 在 `webpack.config.js` 配置文件中导出多个 Webpack 配置对象，如：
   ```javascript
   module.exports = [{
       entry: 'pageA.js',
       output: {
           path: './dist',
           filename: 'pageA.js'
       }
   }, {
       entry: 'pageB.js',
       output: {
           path: './dist',
           filename: 'pageB.js'
       }
   }];
   ```

3. 执行`npx parallel-webpack`命令

Parallel-Webpack 会为配置文件中导出的每个 Webpack 配置对象启动一个独立的构建进程，从而实现并行编译的效果。**底层原理**很简单，基本上就是在 Webpack 上套了个壳：

- 根据传入的配置项数量，调用 `worker-farm` 创建复数个工作进程；
- 工作进程内调用 Webpack 执行构建；
- 工作进程执行完毕后，调用 `node-ipc` 向主进程发送结束信号。

更多：[Webpack5 核心原理与应用实践 - 范文杰 - 掘金小册 (juejin.cn)](https://juejin.cn/book/7115598540721618944/section/7118367743077777442?enter_from=course_center)

#### 并行压缩

Webpack4 默认使用 [Uglify-js](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fuglifyjs-webpack-plugin) 实现代码压缩，Webpack5 之后则升级为 [Terser](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fplugins%2Fterser-webpack-plugin%2F) —— 一种[性能](https://link.juejin.cn/?target=https%3A%2F%2Fblog.logrocket.com%2Fterser-vs-uglify-vs-babel-minify-comparing-javascript-minifiers%2F)与兼容性更好的 JavaScript 代码压缩混淆工具，两种组件都原生实现了多进程并行压缩能力。

以 Terser 为例，TerserWebpackPlugin 插件默认已开启并行压缩，开发者也可以通过 `parallel` 参数（默认值为 `require('os').cpus() - 1`）设置具体的并发进程数量，如：
```javascript
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            parallel: 2 // number | boolean
        })],
    },
};
```

上述配置即可设定最大并行进程数为 2。此外，Webpack4 所使用的 `uglifyjs-webpack-plugin` 也提供了类似的功能，用法与 Terser 相同。









