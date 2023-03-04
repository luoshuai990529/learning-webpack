#构建性能分析工具

Webpack在大型项目中通常性能表现不佳，这一方面是因为JavaScript语言的**单线程**架构决定了Webpack的运算效率就不可能很高；另一方面是因为在大型项目中，它通常需要借助许多组件(插件、Loader)完成大量的文件读写、代码编译操作。在开发者视角中，有许多有效的性能优化方法：缓存、并发、优化文件处理步骤，但在着手优化之前，有必要简单了解Webpack打包的核心流程；了解哪些步骤比较耗时，可能会造成性能卡点；以及，如何借助一些可视化工具分析Webpack的编译性能。

### 核心流程

其中最核心的功能，1-使用适当Loader将任意类型文件转移为JavaScript代码，如将CSS代码转译成JS字符串，将多媒体文件转译为Base64代码等；2-将这些经过Loader处理的文件资源合并、打包成向下兼容的产物文件。为了实现这些，大致工作流程可以分为如下阶段：

1. 初始化阶段：
   - **初始化参数：**从配置文件、配置对象、Shell参数中读取，与默认配置结合得出最终的参数；
   - **创建编译器对象：**用上一步得到的参数创建Compiler对象；
   - **初始化编译环境：**包括注入内置插件、注册各种模块工厂、初始化RuleSet集合、加载配置的插件等。
   - **开始编译：**执行compiler对象的run方法，创建Compilation对象；
   - **确定入口：**根据配置中的`entry`找出所有的入口文件，调用`compilation.addEntry`将入口文件转换为`dependence`对象。
2. 构建阶段：
   - **编译模板(make)：**从`entry`文件开始，调用`loader`将模块转译为标准的JavaScript内容，调用JavaScript解析器将内容转换为**AST**对象，从中找出该模块依赖的模块，再**递归**处理这些依赖模块，直到所有入口依赖的文件都经过了本步骤的处理；
   - **完成模块编译：**上一步递归处理所有能触达的模块后，得到了每个模块被翻译后的内容以及它们之间的`依赖关系图`。
3. 封装阶段：
   - **合并(seal)：**根据入口和模块之间的依赖关系，组成一个个包含多个模块的`Chunk`；
   - **优化(optimization)：**对上述的Chunk施加一系列优化操作，包括：**tree-shaking、terser、scope-hoisting、压缩、Code Split**等；
   - **写入文件系统(emitAssets)**：在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统中。

可能造成性能问题的地方：

- 构建阶段：
  -  首先需要将文件引入的相对路径转换成绝对路径，这个过程可能设计多次IO操作，执行的效率取决于**文件层次的深度**；
  - 找到具体文件后，需要读入文件执行loader-runner遍历数组完成内容转译，这个过程需要执行密集CPU处理，处理的效率取决于**Loader的数量和复杂度**；
  - 需要将模块的内容解析为AST，在通过AST分析模块的依赖关系，这个过程同样需要密集CPU处理，执行效率取决于**代码复杂度**；
  - 递归处理依赖资源，执行效率取决于**模块数量**；
- 封装阶段：
  - 根据`splitChunks`配置、`entry`配置、动态模块引入语句等，确定模块和Chunk的映射关系，其中`splitChunks`相关的分包算法非常复杂，涉及大量CPU计算；
  - 根据`optimization`配置执行一系列产物优化操作，特别是`Terser`插件需要执行大量AST相关的运算，执行效率取决于**产物代码量**

### 性能分析

我们可以通过一些具体的优化方法去对上述的性能问题进行优化，但是我们需要先知道：如何收集、分析Webpack打包过程的性能数据。

收集数据的方法很简单，Webapck内置了`stats`接口，专门用于统计模块构建耗时、模块依赖关系等信息，推荐用法：

1. 添加`profile = true`配置：
   ```javascript
   // webpack.config.js
   module.exports = {
   	profile: true
   }
   ```

2. 运行编译命令，并添加`--json`参数，参数值为最终生成的统计文件名，如：
   ```powershell
   npx webpack --json=stats.json
   ```

   上述命令执行完毕后，会在文件夹下生成`stats.json`文件，内容大致如下：
   ```javascript
   {
     "hash": "2c0b66247db00e494ab8",
     "version": "5.36.1",
     "time": 81,
     "builtAt": 1620401092814,
     "publicPath": "",
     "outputPath": "/Users/tecvan/learn-webpack/hello-world/dist",
     "assetsByChunkName": { "main": ["index.js"] },
     "assets": [
       // ...
     ],
     "chunks": [
       // ...
     ],
     "modules": [
       // ...
     ],
     "entrypoints": {
       // ...
     },
     "namedChunkGroups": {
       // ...
     },
     "errors": [
       // ...
     ],
     "errorsCount": 0,
     "warnings": [
       // ...
     ],
     "warningsCount": 0,
     "children": [
       // ...
     ]
   }
   ```

   `stats`对象收集了Webpack运行过程中许多值得关注的信息，如：

   - `modules`：本次打包处理的所有模块列表，内容包含模块的大小，所属`chunk`、构建原因、依赖模块等，特别是`modules.profile`属性，包含了构建模块时，解析路径、编译、打包、子模块打包等各个环节所花费的时间，很有用；
   - `chunks`：构建过程生成的`chunks`列表，数组内容包含了`chunk`名称、大小、包含了哪些模块等；
   - `assets`：编译后最终输出产物列表、文件路径、文件大小等；
   - `entrypoints`：entry列表，包括动态引入所生产的entry项也会包含在这里面；
   - `children`：子Compiler对象的性能数据，如`enxtract-css-chunk-plugin`插件内部就会调用`compilation.createChildCompiler`函数创建出子Compiler来做css的抽取；
   - ....

   有了这些数据，我们就可以分析出模块之间的依赖关系、体积占比、编译构建耗时等，Webpack社区中还提供了许多优秀的一些分析工具，可以把这些数据去转换成可视化图标，更高效的找出性能卡点：

   - [Webpack Analysis](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.github.io%2Fanalyse%2F) ：Webpack 官方提供的，功能比较全面的 `stats` 可视化工具；(简化版：[webpack-deps-tree](https://link.juejin.cn/?target=https%3A%2F%2Fmshustov.github.io%2Fwebpack-deps-tree%2Fstatic%2F)，功能相似但用法更简单、信息更简洁，可以根据实际需要交叉使用)
     ![image-20230304153936437](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230304153936437.png)
   - [Statoscope](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fstatoscope%2Fstatoscope)：主要侧重于模块与模块、模块与 chunk、chunk 与 chunk 等，实体之间的关系分析；
   - [Webpack Visualizer](https://link.juejin.cn/?target=https%3A%2F%2Fchrisbateman.github.io%2Fwebpack-visualizer%2F)：一个简单的模块体积分析工具，真的很简单！
   - [Webpack Bundle Analyzer](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fwebpack-bundle-analyzer)：应该是使用率最高的性能分析工具之一，主要实现以 Tree Map 方式展示各个模块的体积占比；
   - [Webpack Dashboard](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fwebpack-dashboard)：能够在编译过程实时展示编译进度、模块分布、产物信息等；
   - [Unused Webpack Plugin](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Funused-webpack-plugin)：能够根据 `stats` 数据反向查找项目中未被使用的文件
   - about more:[Webpack5 核心原理与应用实践 - 范文杰 - 掘金小册 (juejin.cn)](https://juejin.cn/book/7115598540721618944/section/7118367034789855247?enter_from=course_center)













