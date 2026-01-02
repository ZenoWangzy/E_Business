'use client';

/**
 * ClipboardPermissionManager Component
 *
 * Manages clipboard permissions and provides fallback options:
 * - Detects clipboard API availability
 * - Requests permissions when needed
 * - Provides fallback methods for unsupported browsers
 * - Shows user-friendly permission UI
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  Copy,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClipboard, type ClipboardPermission } from '@/hooks/useClipboard';

export interface ClipboardPermissionManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionResolved?: (granted: boolean) => void;
}

export function ClipboardPermissionManager({
  open,
  onOpenChange,
  onPermissionResolved,
}: ClipboardPermissionManagerProps) {
  const {
    permission,
    checkPermission,
    requestPermission,
    copyToClipboard,
  } = useClipboard({
    disableToast: true,
  });

  const [isChecking, setIsChecking] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [testText, setTestText] = useState('测试剪贴板功能 - Test clipboard functionality');

  // Check permission on mount
  useEffect(() => {
    if (open) {
      checkCurrentPermission();
    }
  }, [open]);

  const checkCurrentPermission = async () => {
    setIsChecking(true);
    try {
      await checkPermission();
    } finally {
      setIsChecking(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await requestPermission();
      if (result === 'granted') {
        onPermissionResolved?.(true);
        onOpenChange(false);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestCopy = async () => {
    try {
      const success = await copyToClipboard(testText);
      if (success) {
        onPermissionResolved?.(true);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Test copy failed:', error);
    }
  };

  const handleUseFallback = () => {
    onPermissionResolved?.(false);
    onOpenChange(false);
  };

  const getPermissionStatus = () => {
    if (isChecking) return { text: '检查权限中...', icon: Shield, color: 'text-yellow-600' };
    if (isRequesting) return { text: '请求权限中...', icon: Shield, color: 'text-blue-600' };

    switch (permission) {
      case 'granted':
        return { text: '权限已授予', icon: ShieldCheck, color: 'text-green-600' };
      case 'denied':
        return { text: '权限被拒绝', icon: X, color: 'text-red-600' };
      case 'prompt':
        return { text: '需要权限授权', icon: AlertTriangle, color: 'text-yellow-600' };
      case 'unsupported':
        return { text: '浏览器不支持', icon: AlertTriangle, color: 'text-orange-600' };
      default:
        return { text: '权限状态未知', icon: Shield, color: 'text-gray-600' };
    }
  };

  const getStatusBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-100 text-green-800">已授权</Badge>;
      case 'denied':
        return <Badge variant="destructive">已拒绝</Badge>;
      case 'prompt':
        return <Badge variant="secondary">待授权</Badge>;
      case 'unsupported':
        return <Badge variant="outline">不支持</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            剪贴板权限设置
          </DialogTitle>
          <DialogDescription>
            为了使用复制功能，需要获取剪贴板访问权限
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon className={cn('h-4 w-4', status.color)} />
              <span className="text-sm font-medium">{status.text}</span>
            </div>
            {getStatusBadge()}
          </div>

          {/* Permission Details */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>为什么需要剪贴板权限？</strong>
              <br />
              复制功能需要访问系统剪贴板才能将内容复制到您的设备。这是现代浏览器的安全要求。
            </AlertDescription>
          </Alert>

          {/* Browser Support Info */}
          {permission === 'unsupported' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>浏览器不支持</strong>
                <br />
                您的浏览器不支持现代剪贴板 API。将使用备用复制方法，可能需要手动选择文本。
              </AlertDescription>
            </Alert>
          )}

          {/* Test Copy Section */}
          {permission === 'granted' || permission === 'prompt' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">测试复制功能</label>
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                {testText}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestCopy}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                测试复制
              </Button>
            </div>
          ) : null}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            {permission === 'prompt' && (
              <Button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {isRequesting ? '请求中...' : '授权剪贴板访问'}
              </Button>
            )}

            {permission === 'denied' && (
              <div className="space-y-2">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    剪贴板权限被拒绝。您可以在浏览器设置中手动开启权限，或使用备用复制方法。
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(
                      'https://support.google.com/chrome/answer/114662?co=GENIE.Platform%3DDesktop&hl=zh-CN',
                      '_blank'
                    );
                  }}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  查看如何开启权限
                </Button>
              </div>
            )}

            <Button
              variant="secondary"
              onClick={handleUseFallback}
              disabled={isRequesting}
              className="w-full"
            >
              使用备用复制方法
            </Button>
          </div>

          {/* Help Links */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Chrome/Edge: 需要启用剪贴板权限</p>
            <p>• Firefox: 需要在安全上下文（HTTPS）中使用</p>
            <p>• Safari: 需要用户手势触发复制操作</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isRequesting}
          >
            稍后设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ClipboardPermissionManager;