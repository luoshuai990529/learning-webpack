# Webpack构建微前端应用

> Module Federation 通常译作“**模块联邦**”，是 Webpack 5 新引入的一种远程模块动态加载、运行技术。MF 允许我们将原本单个巨大应用按我们理想的方式拆分成多个体积更小、职责更内聚的小应用形式，理想情况下各个应用能够实现独立部署、独立开发(不同应用甚至允许使用不同技术栈)、团队自治，从而降低系统与团队协作的复杂度 —— 没错，这正是所谓的微前端架构。
>
> *An architectural style where independently deliverable frontend applications are composed into a greater whole —— 摘自《**[Micro Frontends](https://link.juejin.cn/?target=https%3A%2F%2Fmartinfowler.com%2Farticles%2Fmicro-frontends.html)**》。*

MF的一些特性：

- 应用可以按需导出若干模块，这些模块最终会被单独打包成模块包，功能上有点像NPM模块；
- 应用可在运行时基于HTTP(S)协议动态加载其他应用暴露的模块，且用法与动态加载普通NPM模块一样简单；
- 与其他微前端方案不同,MF的应用之间关系平等，没有主应用/子应用之分，每个应用都能导出/导入任意模块；