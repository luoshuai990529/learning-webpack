### 搭建Vue全栈开发环境

使用Webpack 搭建Vue 应用开发环境，包括：

- 如何使用 `vue-loader` 处理 Vue SFC 文件？
- 如何使用 `html-webpack-plugin`、`webpack-dev-server` 运行 Vue 应用？
- 如何在 Vue SFC 中复用 TypeScript、Less、Pug 等编译工具？
- 如何搭建 Vue SSR 环境？
- 如何使用 Vue CLI？

## 使用 Vue-loader 处理 SFC(单文件组件) 代码

形态上，Vue SFC（Single File Component）是使用类 html 语法描述Vue组件的自定义文件格式，文件由四种类型的顶层语法块组成：

- `<template>`:指定Vue组件模板，支持html、Pug等语法，内容会被预编译为Javascript渲染函数；
- `<script>`:用于定义组件选项对象，在Vue2版本支持导出普通对象或 defineComponent值；Vue3之后还支持`<script setup>`方式定义组件的 `setup()`函数；
- `<style>`:用于定义组件样式，通过配置Loader可以实现Less、Sass等预处理器语法支持；也可以通过添加`scoped、module`属性将样式封装在当前组件内；
- Custom Block: 用于满足淋雨特定需求而预留的SFC扩展模块，例如`<docs>` ; Custom Block 通常需要搭配特定工具使用，详情参考[Custom Blocks | Vue Loader](https://link.juejin.cn/?target=https%3A%2F%2Fvue-loader.vuejs.org%2Fguide%2Fcustom-blocks.html%23example) 。

原生Webpack不能处理这种内容格式的文件，需要我们引入Vue SFC的加载器：vue-loader:
```javascript
yarn add -D webpack webpack-cli vue-loader
```

修改webpack 配置，加入相关声明：
```javascript
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: ["vue-loader"],
      },
    ],
  },
  plugins: [new VueLoaderPlugin()],
};
```

> 提示：`vue-loader` 库同时提供用于处理 SFC 代码转译的 Loader 组件，与用于处理上下文兼容性的 Plugin 组件，两者需要同时配置才能正常运行。

经过 `vue-loader` 处理后，SFC 各个模块会被等价转译为普通 JavaScript 模块，例如：

![webpack4-1](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/webpack4-1.png)

可以看到，模板的内容被转移为用于构造 VDom（虚拟dom）结构的render函数；`<script>`标签导出的对象会被转译为javascript对象字面量形式。

> 注意：此时，上述webpack配置还无法处理CSS代码，此时添加style模块将会报错

为此需要添加处理CSS规则，完整配置：

```javascript
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  module: {
    rules: [
      { test: /\.vue$/, use: ["vue-loader"] },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [new VueLoaderPlugin()],
};
```





