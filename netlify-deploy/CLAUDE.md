[根目录](../../CLAUDE.md) > **netlify-deploy**

# 变更记录 (Changelog)
- 2025-12-15: 更新模块文档，明确为静态部署版本
- 2025-12-11: 原始版本（纯前端电商详情页生成工具）

# 模块职责

Netlify-deploy模块是E_Business项目的静态部署演示版本，基于原生JavaScript实现：
- 纯前端的电商详情页生成工具
- 四步向导式工作流程
- 多格式文件解析（PDF/Word/Excel/图片）
- 轮播图和详情页自动生成
- 支持拖拽排序和批量导出

## 当前状态
- **演示版本**: 展示核心功能流程
- **无后端依赖**: 纯前端实现，可独立部署
- **逐步迁移**: 核心功能将迁移至新的前后端分离架构

# 技术架构

## 技术栈
- **前端**: 原生JavaScript ES6+
- **样式**: 纯CSS
- **第三方库**:
  - PDF.js (PDF解析)
  - Mammoth.js (Word解析)
  - SheetJS (Excel解析)
  - html2canvas (图片导出)

## 核心模块
1. **入口层**: `index.html` - SPA应用入口
2. **状态管理**: `js/steps.js` - 四步向导状态机
3. **业务逻辑**: `js/app.js` - 文件处理和品类管理
4. **生成引擎**: `js/generator.js` - 内容生成和渲染
5. **样式系统**: `css/style.css` - 响应式UI

# 入口与启动

## 本地开发
```bash
# 使用Python
python -m http.server 8000

# 使用Node.js
npx serve -p 8000
npx http-server -p 8000

# 访问 http://localhost:8000
```

## 部署到Netlify
```bash
# 推送到Git后自动部署
git push origin main

# 或使用Netlify CLI
netlify deploy --prod --dir=.
```

# 核心功能

## 四步向导流程
1. **文件上传**: 支持多格式文件拖拽上传
2. **品类选择**: 选择商品分类
3. **风格配置**: 选择生成风格和数量
4. **生成导出**: 自动生成并支持批量下载

## 文件处理能力
- **PDF**: 解析前10页文本内容
- **Word**: 提取文档纯文本
- **Excel**: 读取前20行数据
- **图片**: 直接作为产品主图

## 生成功能
- **轮播图**: 5-8张，支持拖拽排序
- **详情页**: 10-13页，包含卖点展示
- **参考图**: 每张图支持上传参考
- **文字标注**: 支持在线编辑和保存

# 部署配置

## Netlify配置 (netlify.toml)
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build]
  publish = "."
  command = "echo 'No build required'"
```

## 特性
- SPA路由支持
- 零构建时间
- 自动HTTPS
- 全球CDN分发

# 浏览器兼容性
- Chrome 70+ (完整支持)
- Firefox 65+ (主要功能)
- Safari 12+ (iOS兼容)
- Edge 79+ (Chromium内核)

# 相关文件清单

## 核心文件
- `index.html` - SPA入口页面
- `js/app.js` - 核心业务逻辑
- `js/steps.js` - 状态管理和步骤控制
- `js/generator.js` - 内容生成引擎
- `css/style.css` - 样式定义

## 配置文件
- `netlify.toml` - Netlify平台配置
- `README.md` - 项目说明
- `部署说明.txt` - 中文部署指南
- `logic.md` - 架构逻辑说明

## 文档
- `CLAUDE.md` - 本文档