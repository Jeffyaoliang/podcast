# DreamEcho 播客平台

DreamEcho 是一个现代化、功能完整的播客平台，支持多端访问和播放。

## 🎯 项目简介

DreamEcho 是一个基于小宇宙 API 构建的播客平台，提供跨平台的播客浏览、搜索、订阅和播放功能。本项目是原版 DreamEcho 的升级版本，在原有 React 前端的基础上，新增了 Go 语言后端和 Android 原生客户端，形成了完整的「前端 + 后端 + 移动端」三端架构。

## 🏗️ 技术架构

本项目采用现代化的三端分离架构，各端技术栈如下：

### 前端（React）
前端采用 React 18 构建，使用 Vite 作为构建工具，提供响应式的 Web 用户界面。主要技术包括 React Router 进行路由管理、Zustand 进行状态管理、Tailwind CSS 进行样式设计。通过 RESTful API 与后端通信，提供流畅的交互体验。

### 后端（Go）
后端使用 Go 语言开发，基于 Gin 框架构建高性能的 RESTful API 服务。相比原有的后端实现，Go 后端具有更高的并发处理能力和更低的资源占用。API 服务提供用户认证、RSS 订阅解析、播客数据获取等功能，支持跨域访问和高效的 JSON 序列化。

### 移动端（Android）
Android 客户端采用 Kotlin 开发，使用 Jetpack Compose 构建现代化的原生界面。原生开发相比 WebView 具有更好的性能表现和用户体验，支持离线缓存、后台播放、系统级通知控制等移动端特有功能。媒体播放模块基于 MediaPlayer 实现，支持进度条拖动和跳转时的声音反馈。

## ✨ 核心功能

DreamEcho 提供丰富的播客相关功能，满足用户从发现到收听的完整需求。在播客发现方面，用户可以浏览热门播客推荐、搜索感兴趣的内容、按照分类筛选节目。订阅管理功能允许用户订阅喜欢的播客节目，查看订阅列表和更新提醒。播放功能支持在线流媒体播放、播放进度控制、后台播放和系统通知栏控制。个人中心提供收听历史记录、睡眠评分分析、播放列表管理等功能。此外，Android 客户端还支持深色模式、离线下载、桌面小组件等移动端特色功能。

## 📁 项目结构

项目根目录下包含三个主要子项目：

```
minimax/
├── android/                 # Android 客户端（Kotlin + Jetpack Compose）
│   ├── app/                # 应用模块
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── kotlin/com/dreamecho/app/  # 主要代码
│   │   │   │   │   ├── MainActivity.kt
│   │   │   │   │   ├── models/               # 数据模型
│   │   │   │   │   ├── network/              # 网络请求
│   │   │   │   │   └── ui/                   # UI 组件
│   │   │   │   │       ├── screens/          # 页面
│   │   │   │   │       └── theme/            # 主题
│   │   │   │   └── res/                      # 资源文件
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   ├── gradle.properties
│   ├── settings.gradle.kts
│   └── gradlew          # Gradle 包装器
│
├── backend/              # Go 后端服务
│   ├── main.go           # 服务入口
│   ├── go.mod
│   └── go.sum
│
├── src/                  # React 前端
│   ├── components/       # 公共组件
│   │   ├── Layout.jsx
│   │   ├── AudioSpectrum.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/            # 页面组件
│   │   ├── Home.jsx
│   │   ├── Search.jsx
│   │   ├── PodcastDetailScreen.kt  # 详情页（Android）
│   │   ├── Show.jsx
│   │   ├── Episode.jsx
│   │   ├── History.jsx
│   │   ├── Profile.jsx
│   │   ├── Login.jsx
│   │   ├── Subscriptions.jsx
│   │   ├── SleepScore.jsx
│   │   ├── Blacklist.jsx
│   │   └── Category.jsx
│   ├── services/         # API 服务
│   │   ├── api.js
│   │   ├── rssService.js
│   │   ├── rssServiceGo.js
│   │   ├── podcastHistory/      # 收听历史管理
│   │   │   ├── HistoryManager.js
│   │   │   ├── PodcastRecord.js
│   │   │   ├── SearchUtils.js
│   │   │   └── StorageService.js
│   │   └── sleepScore/          # 睡眠评分
│   │       ├── podcastContentAnalyzer.js
│   │       └── sleepScoreCalculator.js
│   ├── store/            # 状态管理
│   │   ├── authStore.js
│   │   ├── historyStore.js
│   │   └── rssStore.js
│   ├── utils/            # 工具函数
│   │   ├── helpers.js
│   │   └── audioProxy.js
│   ├── config/           # 配置文件
│   │   └── goBackend.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── public/               # 静态资源
│   └── vite.svg
│
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── README.md
├── README_RSS.md
└── RSS测试指南.md
```

## 🚀 快速开始

### 1. 前端运行

前端项目基于 Node.js 和 Vite 构建，按照以下步骤启动：

首先进入项目根目录，使用 npm 或 yarn 安装依赖。安装完成后，启动开发服务器，默认访问地址为 http://localhost:5173。如果需要构建生产版本，可以执行 build 命令，生成的静态文件会输出到 dist 目录。

### 2. 后端运行

后端基于 Go 语言开发，使用 Gin 框架。启动前确保已安装 Go 1.19 或更高版本。进入 backend 目录，执行 go run main.go 命令启动服务。后端默认监听 8080 端口，提供 RSS 解析、用户认证、播客数据获取等 API 接口。

### 3. Android 运行

Android 项目基于 Kotlin 和 Jetpack Compose 构建，需要 Android Studio 或命令行环境。确保已安装 Android SDK 和 Gradle 工具链。打开 android 目录，Android Studio 会自动同步 Gradle 配置。连接真机或启动模拟器，点击运行按钮或执行 ./gradlew assembleDebug 编译调试版本。

## 🔧 配置说明

### 前端配置

前端通过环境变量配置 API 地址，创建 .env 文件可覆盖默认配置。VITE_API_BASE_URL 用于指定后端服务地址，默认指向本地 8080 端口。在开发阶段，可以同时启动前后端进行联调测试。

### 后端配置

后端服务支持通过配置文件或环境变量进行配置。主要配置项包括服务监听端口、数据库连接（如果有）、跨域白名单等。Go 后端默认监听 8080 端口，支持 CORS 跨域请求。

### Android 配置

Android 项目支持多渠道打包，通过 build.gradle.kts 配置不同环境的构建参数。应用需要网络权限才能访问后端 API，确保设备网络连接正常。

## 📱 功能演示

### Web 端功能

Web 端提供完整的播客浏览和收听体验。用户可以在首页查看热门播客推荐，点击卡片进入播客详情页查看节目列表。选择任意节目即可在线播放，播放过程中支持暂停、继续、进度调整等操作。搜索功能支持按标题、作者等关键词查找播客。个人中心展示收听历史、睡眠评分统计等数据。

### Android 端功能

Android 客户端在 Web 端功能基础上，增加了原生应用的体验优势。原生媒体播放支持后台播放和系统通知栏控制，用户切换到其他应用时仍可继续收听。播放界面提供进度条，用户可以拖动跳转至任意位置，每次跳转会有系统提示音反馈。深色模式自动适配系统主题，夜间使用更加护眼。离线功能支持将播客下载到本地，无网络环境下也能收听。

## 🛠️ 技术亮点

本项目在技术实现上有以下几个亮点值得分享。首先是三端分离架构，前端、后端、移动端各自独立开发部署，通过标准化的 RESTful API 进行通信，便于团队协作和后期维护。其次是高效的 RSS 解析，Go 后端实现了快速的 RSS 订阅解析，支持多种播客格式，解析性能优异。再次是响应式设计，Web 端采用 Tailwind CSS 实现响应式布局，适配手机、平板、桌面等多种设备。最后是原生体验，Android 端采用 Jetpack Compose 构建声明式 UI，配合原生媒体播放引擎，提供流畅的移动端使用体验。

## 📝 开发日志

项目当前版本为 v2.0，主要更新包括新增 Go 语言后端服务，采用 Gin 框架重构了原有的后端 API，性能提升显著；新增 Android 原生客户端，使用 Kotlin 和 Jetpack Compose 开发，支持完整的播客播放和订阅功能；新增播放进度条和跳转功能，Android 端支持拖动进度条跳转播放位置，并提供声音反馈；新增睡眠评分功能，通过分析播客内容为用户提供个性化的睡眠建议。

## 👥 创作者

本项目由以下开发者共同完成：

- [@jeffyaoliang](https://github.com/jeffyaoliang) - 项目发起人，主要开发
- [@amyxiang12](https://github.com/amyxiang12) - 设计和开发

## 📄 许可证

本项目采用 MIT 许可证开源。

## ⚠️ 注意事项

本项目仅供学习、研究使用，请遵守国家相关法律法规，严禁用于任何非法用途。使用本项目时请注意：需要配合后端服务才能正常使用完整功能；部分播客源可能因为网络原因无法访问；Android 应用需要 Android 8.0 或更高版本才能正常运行。

## 📚 相关项目

本项目基于以下开源项目构建：

- [xyz - 小宇宙 FM API](https://github.com/ultrazg/xyz) - 提供播客数据 API
- [Gin](https://github.com/gin-gonic/gin) - Go 后端框架
- [Jetpack Compose](https://developer.android.com/compose) - Android UI 框架
- [React](https://react.dev/) - 前端框架
- [Vite](https://vitejs.dev/) - 构建工具
