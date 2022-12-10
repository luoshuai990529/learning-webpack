### 概述

根据 [State-of-JS 2021](https://link.juejin.cn/?target=https%3A%2F%2F2021.stateofjs.com%2Fen-US%2Flibraries%2Fbuild-tools) 的统计，webpack还是保持着很高的使用率，其他构建工具短期内不可能太撼动webpack的头部地位。第二，Vite一类的Unbundle工具定位于解决特定问题，而webpack无所不能。webpack还在持续发展迭代，V5版本之后退出的持久化缓存、lazyCompilation强化了构建性能，虽然不大可能超过Unbundle方案的性能优势，但是应该会逐渐缩小差距被用户接受。

#### webpack打包过程

webpack打包过程非常复杂，但大致上可以分为以下几步：
![webpack](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/webpack.jpg)

- **输入**：从文件系统读入代码文件
- **模块递归处理**：调用loader转译module内容，并将结果转换为AST，从中分析出模块依赖关系，进一步递归调用模块处理过程，知道所有依赖文件都处理完毕；
- **后处理**：所有模块递归处理完毕后开始执行后处理，包括模块合并、注入运行时、产物优化等，最终输出chunk集合
- **输出**：将Chunk写出到外部文件系统

从上述打包流程角度，Webpack配置项大体可以分为两类：

- **流程类**：作用于打包流程某个或若干个环节，直接影响编译打包效果的配置项
- **工具类**：打包主流程之外，提供更多工程化配置项

与打包流程强相关的配置有：

- 输入输出：
  - `entry`:用于定义项目入口文件，webpack会从这些入口文件开始按线索寻找出所有项目文件；
  - `context`:项目执行上下文路径
  - `output`:配置产物输出路径、名称
  - `resolve`:用于配置模块路径解析规则，可以帮助webpack更精准高效的找到模块
  - `module`:用于配置模块加载规则，例如针对什么类型的资源需要使用哪些loader进行处理
  - `externals`:用于声明外部资源，webpack会直接忽略这部分资源，跳过这些资源的解析、打包操作
- 后处理：
  - `optimization`:用于控制如何优化产物包体积，内置Dead Code Elimination Scope Hoisting、代码混淆、代码压缩等功能。
  - `target`:用于配置编译产物的目标运行环境，支持web、node、electron等值，不同值最终产物会有所差异。
  - `mode`:编译模式短语，支持`development`、`production`等值，可以理解为声明环境。

以上重点：webpack**首先**需要根据输入配置(`entry/context`)来找到项目入口文件；**接着**根据按模块处理(`module/resolve/externals`等)所配置的规则处理模块文件，处理过程包括了转译、依赖分析等；等模块处理完毕后，**最后**根据后处理相关配置(`optimization/target`)合并模块资源、注入运行时依赖、输出产物结构等。

除了核心的打包功能之外，webpack还提供了一系列用于提升研发效率的工具，大体上可以分为如下：

- 开发效率类
  - `watch`:用于配置持续监听文件变化，持续构建
  - `devtool`:用于配置产物Sourcemap生成规则
  - `devSever`:用于配置HMR强相关的开发服务器功能
- 性能优化类
  - `cache`:webpack5之后，该项用于控制如何缓存编译过程信息与编译结果
  - `performance`:用于配置当产物大小超过阈值时，如何通知开发者
- 日志类
  - `stats`:用于精确地控制编译过程的日志内容，在做比较细致的性能调试时非常有用
  - `infrastructureLoggin`：用于控制日志输出方式，例如可以通过该配置将日志输出到磁盘文件
- 等等....

![webpack2](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/webpack2.jpg)

开始深入学习吧~
