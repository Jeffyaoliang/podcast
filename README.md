# 小宇宙 Web 应用

基于 [xyz](https://github.com/ultrazg/xyz) API 构建的现代化小宇宙播客 Web 应用。

## 功能特性

- 🎧 播客浏览和搜索
- 📱 响应式设计，支持移动端和桌面端
- 🔐 用户登录和认证
- ⭐ 订阅管理
- 💬 评论功能
- 📊 热门榜单和推荐
- 🎨 现代化 UI 设计

## 技术栈

- **前端框架**: React 18
- **构建工具**: Vite
- **路由**: React Router
- **状态管理**: Zustand
- **HTTP 客户端**: Axios
- **样式**: Tailwind CSS
- **图标**: Lucide React

## 安装

```bash
# 安装依赖
npm install

# 或使用 yarn
yarn install
```

## 配置

1. 确保已运行 xyz API 服务（默认端口 23020）
2. 如需修改 API 地址，创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:23020
```

## 运行

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
src/
├── components/       # 公共组件
│   └── Layout.jsx   # 布局组件
├── pages/           # 页面组件
│   ├── Home.jsx     # 首页
│   ├── Search.jsx   # 搜索页
│   ├── Show.jsx     # 播客详情页
│   ├── Episode.jsx  # 单集详情页
│   ├── Profile.jsx  # 个人中心
│   ├── Login.jsx    # 登录页
│   └── ...
├── services/        # API 服务
│   └── api.js       # API 封装
├── store/           # 状态管理
│   └── authStore.js # 认证状态
├── App.jsx          # 应用入口
└── main.jsx         # 入口文件
```

## 注意事项

⚠️ **本项目仅供学习、研究使用，请遵守国家法律，严禁用于任何非法用途**

- 需要先运行 [xyz](https://github.com/ultrazg/xyz) API 服务
- 登录功能可能已失效（参考 xyz 项目说明）
- 请遵守相关法律法规和平台使用条款

## 许可证

MIT License

## 相关项目

- [xyz - 小宇宙FM API](https://github.com/ultrazg/xyz)

