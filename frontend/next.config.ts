import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const { withSentryConfig } = require("@sentry/nextjs");

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // 实验性特性
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // 支持大文件上传
    },
  },

  // API 代理配置：将 /api/v1/* 请求代理到 FastAPI 后端
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
    ];
  },

  // 图片域名白名单
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Webpack 配置（用于 Web Worker 支持）
  webpack: (config, { isServer }) => {
    // PDF.js Worker 配置
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

// 应用 Sentry 和 next-intl 插件
export default withSentryConfig(
  withNextIntl(nextConfig),
  {
    // Sentry 配置
    silent: process.env.NODE_ENV === 'development', // 在开发环境中不打印 Sentry 日志
    org: process.env.SENTRY_ORG || '',
    project: process.env.SENTRY_PROJECT || '',
    // 上传 sourcemap 以便更好的错误追踪
    widenClientFileUpload: true,
    // 忽略某些文件以减小上传大小
    ignoreFile: ['.gitignore', '.next/static', '.next/cache'],
  }
);
