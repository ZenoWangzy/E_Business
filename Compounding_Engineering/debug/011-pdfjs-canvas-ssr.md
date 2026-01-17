# 问题

在 Next.js 16 使用 Webpack 模式时，`pdfjs-dist` 在 SSR 时尝试 `require('canvas')`，导致 `Module not found: Can't resolve 'canvas'` 错误。

## 错误信息

```
Module not found: Can't resolve 'canvas'
  ./node_modules/pdfjs-dist/build/pdf.js:6247:1

Import trace:
  ./src/lib/parsers/index.ts
  ./src/components/business/SmartDropzone.tsx
```

## 根本原因

`pdfjs-dist` 包含 Node.js 特定的 `NodeCanvasFactory` 类，它尝试在服务端渲染时加载 `canvas` 模块。`canvas` 是一个原生模块，需要编译且通常只在 Node 环境使用。

## 解决方案

在 `next.config.ts` 中将 `canvas` 标记为服务端 external：

```typescript
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals = config.externals || [];
    config.externals.push({
      canvas: 'commonjs canvas',
    });
  }
  return config;
}
```

## 备选方案

1. 安装 `canvas` 包: `npm install canvas`（需要编译环境）
2. 使用 `pdfjs-dist/legacy/build/pdf` 路径避免 Node 特定代码
3. 动态导入 `pdfjs-dist` 仅在客户端加载
