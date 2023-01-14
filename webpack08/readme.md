# 构建PWA(渐进式Web 应用)

PWA(Progressive Web Apps)，原始定义复杂，可以简单理解为**一系列将网页如同独立APP搬安装到本地的技术集合**，借此，我们即可以保留普通网页的轻量级、可链接(SEO友好)、低门槛(只要有浏览器就能访问)等优秀特点，又同时具备独立APP离线运行、可安装等优势。

实现上，PWA与普通Web应用的开发方法大致相同，都是用css、js、html定义应用的样式、逻辑、结构，两者主要区别在于，PWA需要用一些技术实现离线与安装功能：

- [ServiceWorker](https://link.juejin.cn/?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FService_Worker_API)： 可以理解为一种介于网页与服务器之间的本地代理，主要实现 PWA 应用的离线运行功能。例如 `ServiceWorker` 可以将页面静态资源缓存到本地，用户再次运行页面访问这些资源时，`ServiceWorker` 可拦截这些请求并直接返回缓存副本，即使此时用户处于离线状态也能正常使用页面；

  ![image-20230113221413321](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230113221413321.png)

- [manifest](https://link.juejin.cn/?target=https%3A%2F%2Fweb.dev%2Fadd-manifest%2F%3Futm_source%3Ddevtools) 文件：描述 PWA 应用信息的 JSON 格式文件，用于实现本地安装功能，通常包含应用名、图标、URL 等内容，例如：

  ```javascript
  // manifest.json
  {
    "icons": [
      {
        "src": "/icon_120x120.0ce9b3dd087d6df6e196cacebf79eccf.png",
        "sizes": "120x120",
        "type": "image/png"
      }
    ],
    "name": "My Progressive Web App",
    "short_name": "MyPWA",
    "display": "standalone",
    "start_url": ".",
    "description": "My awesome Progressive Web App!"
  }
  ```

  我们可以选择自行开发、维护 `ServiceWorker` 及 `manifest` 文件 ，也可以简单点使用 Google 开源的 Workbox 套件自动生成 PWA 应用的壳，首先安装依赖：
  ```javascript
  yarn add -D workbox-webpack-plugin webpack-pwa-manifest
  ```

  其中：

  - `workbox-webpack-plugin`：用于自动生成 `ServiceWorker` 代码的 Webpack 插件；
  - `webpack-pwa-mainifest`：根据 Webpack 编译结果，自动生成 PWA Manifest 文件的 Webpack 插件。

  之后，在`webpack.config.js`配置文件中注册插件：
  ```javascript
  const HtmlWebpackPlugin = require("html-webpack-plugin");
  const { GenerateSW } = require("workbox-webpack-plugin");
  const WebpackPwaManifest = require("webpack-pwa-manifest");
  
  module.exports = {
    // ...
    plugins: [
      new HtmlWebpackPlugin({
        title: "Progressive Web Application",
      }),
      // 自动生成 Manifest 文件
      new WebpackPwaManifest({
        name: "My Progressive Web App",
        short_name: "MyPWA",
        description: "My awesome Progressive Web App!",
        publicPath: "/",
        icons: [
          {
            // 桌面图标，注意这里只支持 PNG、JPG、BMP 格式
            src: path.resolve("src/assets/logo.png"),
            sizes: [150],
          },
        ],
      }),
      // 自动生成 ServiceWorker 文件
      new GenerateSW({
        clientsClaim: true,
        skipWaiting: true,
      }),
    ],
  };
  ```

  编译后会生成如下资源：
  ```javascript
  ├─ 8-1_pwa
  │  ├─ src
  │  │  ├─ xxx
  │  ├─ dist
  │  │  ├─ icon_150x150.119e95d3213ab9106b0f95100015a20a.png
  │  │  ├─ index.html
  │  │  ├─ main.js
  │  │  ├─ manifest.22f4938627a3613bde0a011750caf9f4.json
  │  │  ├─ service-worker.js
  │  │  ├─ workbox-2afe96ff.js
  │  └─ webpack.config.js
  ```

  接下来，我们使用`http-server`到dist目录下开启一个服务，运行index.html 并使用 Chrome 打开页面，打开开发者工具，切换到 `Applicatios > Service Workers` 面板，可以看到：
  ![image-20230113223537014](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230113223537014.png)
  这表明 Service Worker 已经正常安装到浏览器上。此外，地址栏右方还会出现一个下载图标：
  ![image-20230113223634096](https://lewis-note.oss-cn-beijing.aliyuncs.com/github/image-20230113223634096.png)
  点击该图标可将应用下载到本地，并在桌面创建应用图标 —— 效果如同安装独立 App 一样。

  > 提示：PWA 是一种复杂度较高的技术，前文只是介绍了一种 Webpack 构建 PWA 的简单方法，感兴趣的同学可以扩展阅读：
  >
  > - [developer.chrome.com/docs/workbo…](https://link.juejin.cn/?target=https%3A%2F%2Fdeveloper.chrome.com%2Fdocs%2Fworkbox%2Fmodules%2Fworkbox-webpack-plugin%2F)
  > - [developers.google.com/web/fundame…](https://link.juejin.cn/?target=https%3A%2F%2Fdevelopers.google.com%2Fweb%2Ffundamentals%2Fprimers%2Fservice-workers)













