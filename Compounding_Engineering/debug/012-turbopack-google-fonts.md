# 问题

Next.js 16 默认启用 Turbopack (`next dev`)，导致 Google Fonts (`next/font/google`) 模块解析失败。

## 错误信息

```
Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  ./src/app/layout.tsx
```

## 根本原因

这是一个 Next.js 16 + Turbopack 的已知兼容性 Bug。Turbopack 在尝试解析 Google Fonts 的内部路径时失败。

## 解决方案

暂时切换回 Webpack 打包器，直到 Next.js 修复此问题。

修改 `package.json`:

```json
"scripts": {
  "dev": "next dev --webpack"
}
```

## 参考

- [Next.js Issues: Turbopack + Google Fonts](https://github.com/vercel/next.js/issues)
