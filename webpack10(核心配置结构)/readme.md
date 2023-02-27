# Webpack核心配置结构

Webpack还支持以数组、函数方式运行参数，以便适配不同的场景需求，他们大致上区别：

1. **单个配置对象：**比较常用的一种方式，逻辑简单适合大多数业务场景。
2. **配置对象数组：**每个数组项都是一个完整的配置对象，每个对象都会触发一次单独的构建，通常需要用于需要为同一份代码构建多种产物的场景，如Library;
3. **函数：**Webpack启动时会执行函数获取配置，可以在函数中根据环境参数(如NODE_ENV)动态调整配置对象。

### 配置数组

导出数组的方式很简单：
```javascript
// webpack.config.js
module.exports = [{
	entry: './src/index.js',
	// ...
}, {
	entry: './src/index.js',
	// ...
}]
```

此时，Webpack会在启动后创建两个`Compilation`实例，并行执行构建工作，但是实例间基本不做通讯，这意味着这种并行构建对运行性能并没有任何正向收益，比如某一个模块在`Compilation`实例A中完成解析、构建后，在其他的`Compilation`中依然需要完整经历构建流程，无法复用结果。

数组的方式主要用于应对“同一份代码打包出多种产物”的场景，例如在构建Library时，我们通常需要同时构建出 ESM/CMD/UMD等模块方案的产物，如：
```javascript
// webpack.config.js
module.exports = [
  {
    output: {
      filename: './dist-amd.js',
      libraryTarget: 'amd',
    },
    name: 'amd',
    entry: './app.js',
    mode: 'production',
  },
  {
    output: {
      filename: './dist-commonjs.js',
      libraryTarget: 'commonjs',
    },
    name: 'commonjs',
    entry: './app.js',
    mode: 'production',
  },
];
// 上述配置可以通过webpack-merge来简化配置逻辑，将其公共部分抽离出来：
const baseConfig = {
	output: {
    	path: './dist'
    },
    name: "amd",
    entry: "./app.js",
    mode: "production",
}

module.exports = [
	merge(baseConfig,{
    	output: {
        	filename: '[name]-amd.js',
            libraryTarget: 'amd'
        }
    }),
    merge(baseConfig,{
    	output: {
        	filename: '[name]-commonjs.js',
            libraryTarget: 'commonjs'
        }
    })
]
```

> 补充：在使用配置数组时，可以通过`--config-name`参数指定需要构建的配置对象，如执行`npx webpack --config-name='amd'`，则仅使用数组中的'amd'项做构建。

### 使用函数配置

配置函数方式要求在配置文件中导出一个函数，并在函数中返回 Webpack 配置对象，或配置数组，或 `Promise` 对象，如：

```javascript
module.exports = function(env, argv) {
  // ...
  return {
    entry: './src/index.js',
    // 其它配置...
  }
}
```

运行时，Webpack会传入两个环境参数对象：

- `env`：通过`--env`传递的命令行参数，适用于自定义参数`npx webpack --env xxx`。例：
  `--env prod` => 参数值：{ prod: true } ；
  `--env prod --env min` => 参数值：{ prod: true, min: true } ；
  `--env platform=app --env production` => 参数值：{ platform: "app", production: true} ；
  `--env foo=bar=app` => 参数值：{ foo: "bar=app"} ；
  `--env app.platform="staging" --env app.name="test"` => 参数值：{ app: { platform: "staging", name: "test" }；
- `argv`:命令行Flags参数，支持`entry、ouput-path、mode、merge`等；

配置函数的方式意义在于，它允许用户根据命令行参数动态创建配置对象，实现简单的多环境治理策略，如：
```javascript
// npx webpack --env app.type=miniapp --mode=production
module.exports = function (env, argv) {
  return {
    mode: argv.mode ? "production" : "development",
    devtool: argv.mode ? "source-map" : "eval",
    output: {
      path: path.join(__dirname, `./dist/${env.app.type}`,
      filename: '[name].js'
    },
    plugins: [
      new TerserPlugin({
        terserOptions: {
          compress: argv.mode === "production", 
        },
      }),
    ],
  };
};
```

### 总结

Webpack 支持三种配置方式：对象、数组、函数，其中对象方式最简单，且能够应对大多数业务开发场景，所以使用率最高；数组方式主要用于构建 Library 场景；函数方式灵活性较高，可用于实现一些简单的环境治理策略。

**环境治理策略：**在现代前端工程化实践中，通常需要将同一个应用项目部署在不同环境(如生产环境、开发环境、测试环境)中，以满足项目参与各方的不同需求：

- 在现代前端工程化实践中，通常需要将同一个应用项目部署在不同环境(如生产环境、开发环境、测试环境)中，以满足项目参与各方的不同需求
- 在现代前端工程化实践中，通常需要将同一个应用项目部署在不同环境(如生产环境、开发环境、测试环境)中，以满足项目参与各方的不同需求
- 生产环境需要尽可能打包出更快、更小、更好的应用代码，确保用户体验。

### 核心配置项汇总

- `entry`：入口文件，Webpack会根据此文件递归找出所有文件依赖；它支持多种形式的参数：
  - 字符串：指定入口文件路径
  - 对象：对象形态功能比较完备，除了可以指定入口文件列表还可以指定入口依赖以及运行时的打包方式
  - 函数：动态生成Entry配置信息，返回值可以是字符串对象或者数组；
  - 数组：配置多页面入口时可以指定多个入口文件。Webpack会将数组指明的入口都打包成一个bundle；
- `output`：声明构建结果的存放位置
- `target`：用于配置编译产物的目标运行环境，支持`web`、`node`、`electron`等值，不同值的最终产物会有所差异
- `mode`：编译模式短语，支持`development、production`等值，Webpack会根据此值推断默认配置；
- `optimization`：用于控制如何优化产物体积，如代码混淆和压缩等功能；
- `module`：用于声明模块的加载规则，针对哪些资源使用哪些loader；
- `plugin`：Webpack插件列表







