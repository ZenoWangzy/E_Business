/**
 * [IDENTITY]: Error Messages Utility
 * 统一错误消息映射，将技术错误转换为用户友好提示
 *
 * [INPUT]: Error object 或 error message string
 * [OUTPUT]: 本地化友好的错误消息
 *
 * [LINK]:
 *   - Consumers -> 各组件的 toast.error 调用
 *
 * [POS]: /frontend/src/lib/utils/errorMessages.ts
 *
 * [PROTOCOL]:
 *   1. 优先匹配已知错误码/模式
 *   2. 未知错误返回通用友好提示
 *   3. 保留调试信息在开发环境
 */

/** 错误消息映射表 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
    // 网络相关
    'Failed to fetch': '网络请求失败，请检查网络连接后重试',
    'Network Error': '网络连接异常，请稍后重试',
    'NetworkError': '网络连接异常，请稍后重试',
    'ECONNREFUSED': '无法连接到服务器，请稍后重试',
    'ETIMEDOUT': '请求超时，请检查网络连接',

    // 认证相关
    'Unauthorized': '登录已过期，请重新登录',
    '401': '登录已过期，请重新登录',
    'Invalid credentials': '用户名或密码错误',
    'Token expired': '登录已过期，请重新登录',

    // 权限相关
    'Forbidden': '您没有权限执行此操作',
    '403': '您没有权限执行此操作',
    'Permission denied': '权限不足',

    // 资源相关
    'Not Found': '请求的资源不存在',
    '404': '请求的资源不存在',

    // 服务器相关
    'Internal Server Error': '服务器繁忙，请稍后重试',
    '500': '服务器繁忙，请稍后重试',
    'Service Unavailable': '服务暂时不可用，请稍后重试',
    '503': '服务暂时不可用，请稍后重试',

    // 文件上传相关
    'File too large': '文件过大，请选择较小的文件',
    'Invalid file type': '不支持的文件格式',
    'Upload failed': '上传失败，请重试',

    // 配额相关
    'Quota exceeded': '已达到使用限额',
    'Insufficient credits': '积分不足，请充值后重试',

    // 生成相关
    'Generation failed': '生成失败，请稍后重试',
    'Task timeout': '任务执行超时，请重试',
};

/** 错误关键词匹配 */
const ERROR_KEYWORDS: Array<{ pattern: RegExp; message: string }> = [
    { pattern: /timeout/i, message: '请求超时，请稍后重试' },
    { pattern: /network/i, message: '网络连接异常，请检查网络' },
    { pattern: /unauthorized|auth/i, message: '登录已过期，请重新登录' },
    { pattern: /forbidden|permission/i, message: '权限不足' },
    { pattern: /not found/i, message: '请求的资源不存在' },
    { pattern: /server error/i, message: '服务器错误，请稍后重试' },
    { pattern: /quota|limit/i, message: '已达到使用限额' },
    { pattern: /upload/i, message: '上传失败，请重试' },
];

/** 默认错误消息 */
const DEFAULT_ERROR_MESSAGE = '操作失败，请稍后重试';

/**
 * 将错误转换为用户友好的消息
 * @param error - Error 对象、字符串或任意值
 * @param fallback - 可选的回退消息
 * @returns 用户友好的错误消息
 */
export function getLocalizedError(
    error: unknown,
    fallback?: string
): string {
    // 提取错误消息
    let errorMessage: string;

    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message);
    } else {
        return fallback || DEFAULT_ERROR_MESSAGE;
    }

    // 精确匹配
    if (ERROR_MESSAGE_MAP[errorMessage]) {
        return ERROR_MESSAGE_MAP[errorMessage];
    }

    // HTTP 状态码匹配
    const statusMatch = errorMessage.match(/\b(4\d{2}|5\d{2})\b/);
    if (statusMatch && ERROR_MESSAGE_MAP[statusMatch[1]]) {
        return ERROR_MESSAGE_MAP[statusMatch[1]];
    }

    // 关键词匹配
    for (const { pattern, message } of ERROR_KEYWORDS) {
        if (pattern.test(errorMessage)) {
            return message;
        }
    }

    // 开发环境保留原始消息
    if (process.env.NODE_ENV === 'development') {
        console.warn('[ErrorMessages] Unhandled error:', errorMessage);
    }

    return fallback || DEFAULT_ERROR_MESSAGE;
}

/**
 * 创建带操作建议的错误消息
 * @param error - 错误
 * @param action - 建议的操作描述
 */
export function getActionableError(
    error: unknown,
    action: string
): string {
    const message = getLocalizedError(error);
    return `${message}。${action}`;
}
