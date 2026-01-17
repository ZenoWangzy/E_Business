# Next.js .next 缓存损坏导致 500 错误

**问题**: 访问任何页面返回 500 Internal Server Error
**影响**: 前端完全不可用

## ❌ 错误日志

```
Error: ENOENT: no such file or directory, open '.../.next/dev/server/pages/_app/build-manifest.json'
Error: ENOENT: no such file or directory, open '.../.next/dev/server/app/page/build-manifest.json'
```

## 🔍 根本原因

`.next` 缓存目录损坏或不完整。常见触发条件：
- 服务器异常终止（Ctrl+C 不完整、系统崩溃）
- 多个 npm 进程冲突写入缓存
- 文件系统同步问题
- 切换 Git 分支后缓存不兼容

## ✅ 修复步骤

```bash
# 1. 停止 dev 服务器
# 2. 删除缓存目录
rm -rf frontend/.next

# 3. 重启开发服务器
cd frontend && npm run dev
```

## 💡 预防措施

1. **优雅关闭**: 使用 `Ctrl+C` 完整关闭 dev 服务器
2. **分支切换**: 切换分支后建议清除 `.next` 缓存
3. **CI/CD**: 构建前始终清除旧缓存

## 📚 相关

- [Next.js Caching Docs](https://nextjs.org/docs/app/building-your-application/caching)
