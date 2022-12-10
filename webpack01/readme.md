### 1.使用vue-cli搭建项目脚手架

安装依赖：

````javascript
npm install -g @vue/cli
// 或者使用 yarn
yarn global add @vue/cli
````

安装成功后通过 `vue -V` 测试是否安装成功
![webpack03](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/webpack03.png)

通过命令创建项目：
```javascript
vue create [项目名]
```

接着CLI 会询问选择何种脚手架方案，一般我们会结合项目的实际需求而选择，通常会选择`Manually select features` 定制特性，配置完成后既可以通过命令行来运行项目了。

Vue CLI底层依赖于Webpack实现编译打包等工程化能力，开发者可以通过`configureWebpack` 与 `chainWebpack`配置项修改Webpack配置信息。

以`configureWebpack`为例,我们需要在`vue.config.js`中写入配置：

```javascript
// vue.config.js
module.exports = {
	configureWebpack: {
		plugins: [
			new MyAwesomeWebpackPlugin()
		]
    }
}
```

上述配置规则与webpack一致，同样支持`plugins/module/resolve`等配置项，**实际上Vue CLI 内部最终会调用`webpack-merge` 将其配置的值与其他上下文配置合并，生成最终的Webpack配置信息。**

`chainWebpack`的用法和`configureWebpack`一致，区别仅在于此处支持`webpack-chain`语法，即以函数方式链式的修改Webpack的配置：

```javascript
// vue.config.js
module.exports = {
  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-loader')
        .tap(options => {
          // modify the options...
          return options
        })
  }
}
```

此时开发者并不知道其脚手架的内部运作细节，我们可以用`inspect`命令生成完整的Webpack配置信息：`vue inspect > output.js` 此外，该命令还提供了根据不同条件生成配置的参数，如针对编译环境生成配置：`vue inspect --mode production > output.prod.js` ；如果想查阅更多可以查阅文档：`vue inspect --help` 。

### 2.使用CRA(Create React Application)搭建项目脚手架

使用CRA同样简单：
```javascript
npx create-react-app my-app
```

执行完毕生成项目文件：
```
my-app
├── README.md
├── node_modules
├── package.json
├── .gitignore
├── public
│   ├── favicon.ico
│   ├── index.html
│   └── manifest.json
└── src
    ├── App.css
    ├── App.js
    ├── App.test.js
    ├── index.css
    ├── index.js
    ├── logo.svg
    └── serviceWorker.js
    └── setupTests.js
```

接着进入`my-app`项目 执行`npm start`命令即可运行项目。

> 更多用法，参考官网： [CRA 官网](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Ffacebook%2Fcreate-react-app)： [github.com/facebook/cr…](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Ffacebook%2Fcreate-react-app%E3%80%82)

默认规则创建的脚手架包含如下工程能力：

- JSX、ES6、TypeScript、Flow 语法支持
- CSS 自动添加 `--webkit--` 前缀
- 基于 [Jest](https://link.juejin.cn/?target=https%3A%2F%2Fjestjs.io%2F) 的自动化测试能力
- 支持 HMR 的开发服务器
- 等等，具体可参考[官网](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnitishdayal%2Fcra_closer_look)

必要时，可以通过`npm run eject` 命令到处完整的项目配置结构，导出配置后，直接修改`webpack.config.js`等相关配置文件即可以控制各项功能行为。









