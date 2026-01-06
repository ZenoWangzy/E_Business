# SSR Hydration 不匹配错误

**问题**: `useNetworkStatus` hook 在服务端和客户端返回不同初始值，导致 React Hydration 失败
**影响**: 页面首次渲染时报错，控制台显示 Hydration 警告

## ❌ 错误代码

```typescript
// 文件: frontend/src/hooks/useNetworkStatus.ts
export function useNetworkStatus(): NetworkStatus {
    // 服务端: typeof navigator === 'undefined' → isOnline = true
    // 客户端: navigator.onLine 可能是 false → isOnline = false
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setIsOnline(navigator.onLine); // ⚠️ 触发重新渲染，导致 Hydration 不匹配
        // ...
    }, []);
}
```

## ✅ 正确代码

```typescript
// 文件: frontend/src/hooks/useNetworkStatus.ts
export function useNetworkStatus(): NetworkStatus {
    // 统一初始状态：服务端和客户端都默认在线
    const [mounted, setMounted] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(true); // ✅ 确保 SSR 一致性
    const [wasOffline, setWasOffline] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setMounted(true); // ✅ 先标记已挂载
        setIsOnline(navigator.onLine); // ✅ 再同步真实状态
        // ...
    }, []);
}
```

## 💡 核心要点

- **统一初始值**: 客户端专有状态（`navigator`/`window`）在首次渲染时必须使用统一的默认值
- **延迟同步**: 在 `useEffect` 中读取客户端 API，确保只在客户端执行
- **mounted 模式**: 使用 `mounted` 状态跟踪组件挂载状态（参考 `AccessibilityProvider`）
- **零闪烁**: 初始默认值应该是最常见/最安全的值，避免用户看到状态突然变化

## 📚 相关

- [AccessibilityProvider mounted 模式](../frontend/#accessibility-provider-mounted-pattern)
- [React Hydration 文档](https://react.dev/link/hydration-mismatch)
