# RSS 功能使用说明

## 问题说明

由于CORS（跨域资源共享）限制，直接从浏览器访问某些RSS Feed可能会失败。我们已经实现了自动代理机制来处理这个问题。

## 支持的RSS Feed

### 推荐测试的RSS链接（通常可以正常访问）

1. **BBC News** (推荐)
   ```
   https://feeds.bbci.co.uk/news/rss.xml
   ```

2. **NPR News**
   ```
   https://feeds.npr.org/1001/rss.xml
   ```

3. **TechCrunch**
   ```
   https://techcrunch.com/feed/
   ```

4. **The Verge**
   ```
   https://www.theverge.com/rss/index.xml
   ```

### 可能无法访问的RSS链接

某些RSS Feed可能因为：
- 服务器限制
- CORS策略
- 网络问题

而无法正常访问。

## 如何添加RSS订阅

1. 点击"搜索"菜单
2. 在"添加 RSS 订阅"输入框中输入RSS链接
3. 点击"添加"按钮
4. 系统会自动验证RSS链接
5. 如果验证成功，会自动跳转到播客详情页

## 故障排除

### RSS链接无法访问

**问题：** 提示"无法获取RSS Feed"

**解决方案：**
1. 检查RSS链接是否正确（可以在浏览器中直接打开测试）
2. 尝试使用其他RSS链接（如BBC、NPR等）
3. 检查网络连接
4. 某些RSS Feed可能需要特殊的访问权限

### 代理服务失败

**问题：** 所有代理都失败

**可能原因：**
- 网络连接问题
- RSS服务器暂时不可用
- RSS链接已失效

**解决方案：**
- 尝试其他RSS链接
- 稍后重试
- 检查RSS链接是否可以在浏览器中直接访问

## 技术说明

本应用使用以下CORS代理服务（按优先级）：
1. api.allorigins.win
2. corsproxy.io
3. api.codetabs.com

如果所有代理都失败，会显示错误提示。

## 建议

- 优先使用公开可访问的RSS Feed（如BBC、NPR等）
- 如果某个RSS链接无法访问，尝试查找该播客的其他RSS源
- 某些播客平台可能不提供公开的RSS Feed

