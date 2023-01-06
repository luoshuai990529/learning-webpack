# 使用Babel加载JSX文件

当我们想要使用JSX的方式去编写React组件的时候，因为浏览器并不支持这种代码，因此我们需要借助工具将JSX等价转换为Javascript代码。
在webpack中我们可以借助`babel-loader`,并使用React预设集`@babel/preset-react`完成JSX到Javascript的转换。安装依赖：

`yarn add -D webpack webpack-cli babel-loader @babel/core @babel/preset-react`

加入babel-loader声明：
```javascript
module.exports = {
  mode: 'none',
  module: {
    rules: [
      {
        test: /\.jsx$/,
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-react"],
        }
      },
    ],
  },
};
```

这样经过`babel-loader`的处理后，JSX将被编译成JavaScript格式的`React.createElement`函数调用：
![image-20230107000535513](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230107000535513.png)

同样的，如果需要处理CSS，还需要添加`css-loader/style-loader`,需要让页面真正运行起来还需要`html-webpack-plugin`和 `webpack-dev-server`。

> 使用TSX

社区有两种主流的TSX加载方案，一种是使用Babel的`@babel/preset-typescript`规则集；二是直接使用`ts-loader`。先从Babel规则集方案说起：

1.安装依赖，核心有：

```
yarn add -D typescript @babel/preset-typescript
```

2.修改Webpack配置，添加用于处理TypeScript代码的规则：

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx$/,
        loader: 'babel-loader',
        options: {
          'presets': [["@babel/preset-react", {
            "runtime": "automatic" // 这种模式会自动导入 react/jsx-runtime，不必开发者手动管理 React 依赖。
          }],
          '@babel/preset-typescript']
        }
      },
    ],
  },
}
```

之后将组件文件后缀改为`.tsx`，Babel就会帮我们完成TypeScript代码编译。

`ts-loader`的用法：

1.安装依赖：

```javascript
yarn add -D typescript ts-loader
```

2.修改webpack配置，添加`ts-loader`规则：

```javascript
module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx$/,
        use: 'ts-loader',
      },
    ],
  }
};
```

3.修改`tsconfig.json`文件，添加jsx配置属性：

```json
{
  "compilerOptions": {
    //...
    "jsx": "react-jsx"
  }
}
```

完毕。使用`babel-loader`可能更通用，配置适当的Preset之后可以做的事情会更多。

> 问题：React JSX经过Webpack转换后的结果与 Vue SFC转换结果相似，为何Vue不能复用Bable而选择了开发一个独立的`vue-loader`插件？
> 答：首先babel的侧重点是JS，而vue的SFC不光包含了JS代码，还有style、template、自定义块等，这些都不在babel处理范畴内，vue-loader内部还是会去复用babel。而react的JSX本质上是`React.createElement`语法糖，经过转化后还是JS，所以可以通过babel预设去进行转化