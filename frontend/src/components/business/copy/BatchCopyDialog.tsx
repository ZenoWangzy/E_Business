'use client';

/**
 * BatchCopyDialog Component
 *
 * A dialog for batch copying multiple text entries with options:
 * - Preview selected items
 * - Choose copy format (merged, list, custom separator)
 * - Show copy progress
 * - Handle errors with retry options
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Copy,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/hooks/useClipboard';
import { type CopyResult } from '@/hooks/useCopyStudio';

// Types
export type CopyFormat = 'merged' | 'list' | 'custom';

export interface BatchCopyOptions {
  format: CopyFormat;
  separator: string;
  includeIndex: boolean;
  includeTitle: boolean;
}

export interface BatchCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CopyResult[];
  defaultOptions?: Partial<BatchCopyOptions>;
}

const DEFAULT_SEPARATOR = '\n\n---\n\n';
const LIST_SEPARATOR = '\n';

export function BatchCopyDialog({
  open,
  onOpenChange,
  items,
  defaultOptions = {},
}: BatchCopyDialogProps) {
  const [options, setOptions] = useState<BatchCopyOptions>({
    format: 'merged',
    separator: DEFAULT_SEPARATOR,
    includeIndex: false,
    includeTitle: true,
    ...defaultOptions,
  });

  const [customSeparator, setCustomSeparator] = useState(DEFAULT_SEPARATOR);
  const [isCopying, setIsCopying] = useState(false);
  const [copyProgress, setCopyProgress] = useState(0);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [previewText, setPreviewText] = useState('');

  const { copyToClipboard, copyLargeText } = useClipboard({
    showSuccessToast: false,
    showErrorToast: false,
  });

  // Calculate combined text based on options
  const combinedText = useMemo(() => {
    if (items.length === 0) return '';

    const texts = items.map((item, index) => {
      let text = '';

      // Add index if enabled
      if (options.includeIndex) {
        text += `${index + 1}. `;
      }

      // Add title if enabled
      if (options.includeTitle && item.type) {
        const typeLabel = {
          titles: '标题',
          descriptions: '描述',
          sellingPoints: '卖点',
          faq: 'FAQ',
        }[item.type] || item.type;
        text += `【${typeLabel}】`;
      }

      // Add content
      text += item.content;

      return text;
    });

    switch (options.format) {
      case 'merged':
        return texts.join(options.separator || customSeparator);

      case 'list':
        return texts.map(t => `• ${t}`).join(LIST_SEPARATOR);

      case 'custom':
        return texts.join(customSeparator);

      default:
        return texts.join('\n\n');
    }
  }, [items, options, customSeparator]);

  // Update preview when text changes
  React.useEffect(() => {
    const maxLength = 500;
    const text = combinedText;
    if (text.length <= maxLength) {
      setPreviewText(text);
    } else {
      setPreviewText(text.substring(0, maxLength) + '...');
    }
  }, [combinedText]);

  // Handle copy action
  const handleCopy = async () => {
    if (!combinedText || isCopying) return;

    setIsCopying(true);
    setCopyStatus('copying');
    setCopyProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setCopyProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const success = await copyLargeText(combinedText);

      clearInterval(progressInterval);
      setCopyProgress(100);

      if (success) {
        setCopyStatus('success');
        // Close dialog after success
        setTimeout(() => {
          onOpenChange(false);
          resetDialog();
        }, 1500);
      } else {
        setCopyStatus('error');
      }
    } catch (error) {
      console.error('Batch copy failed:', error);
      setCopyStatus('error');
    } finally {
      setIsCopying(false);
    }
  };

  // Reset dialog state
  const resetDialog = () => {
    setCopyStatus('idle');
    setCopyProgress(0);
    setPreviewText('');
  };

  // Handle dialog close
  const handleClose = () => {
    if (isCopying) return;
    onOpenChange(false);
    resetDialog();
  };

  // Get icon based on status
  const getStatusIcon = () => {
    switch (copyStatus) {
      case 'copying':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Copy className="h-4 w-4" />;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (copyStatus) {
      case 'copying':
        return '正在复制...';
      case 'success':
        return '复制成功！';
      case 'error':
        return '复制失败';
      default:
        return `准备复制 ${items.length} 项内容`;
    }
  };

  // Calculate text size
  const textSizeKB = Math.round(combinedText.length / 1024);
  const isLargeText = textSizeKB > 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            批量复制内容
          </DialogTitle>
          <DialogDescription>
            选择复制格式，预览内容后复制到剪贴板
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Items Summary */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>已选择 {items.length} 项内容</span>
            <Separator orientation="vertical" className="h-4" />
            <span>约 {textSizeKB}KB</span>
            {isLargeText && (
              <Badge variant="secondary" className="text-xs">
                大文本
              </Badge>
            )}
          </div>

          {/* Copy Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <Label className="text-sm font-medium">复制选项</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Format Selection */}
              <div className="space-y-2">
                <Label className="text-sm">格式</Label>
                <RadioGroup
                  value={options.format}
                  onValueChange={(value: CopyFormat) =>
                    setOptions(prev => ({ ...prev, format: value }))
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merged" id="merged" />
                    <Label htmlFor="merged">合并复制</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="list" id="list" />
                    <Label htmlFor="list">列表格式</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">自定义</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Additional Options */}
              <div className="space-y-2">
                <Label className="text-sm">附加选项</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeIndex"
                      checked={options.includeIndex}
                      onChange={(e) =>
                        setOptions(prev => ({ ...prev, includeIndex: e.target.checked }))
                      }
                      className="rounded"
                    />
                    <Label htmlFor="includeIndex" className="text-sm">
                      包含序号
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeTitle"
                      checked={options.includeTitle}
                      onChange={(e) =>
                        setOptions(prev => ({ ...prev, includeTitle: e.target.checked }))
                      }
                      className="rounded"
                    />
                    <Label htmlFor="includeTitle" className="text-sm">
                      包含类型标签
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Separator */}
            {options.format === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="separator" className="text-sm">
                  自定义分隔符
                </Label>
                <Textarea
                  id="separator"
                  value={customSeparator}
                  onChange={(e) => setCustomSeparator(e.target.value)}
                  placeholder="输入分隔符文本..."
                  className="min-h-[60px] font-mono text-xs"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">预览</Label>
            <ScrollArea className="h-[200px] w-full rounded-md border">
              <div className="p-3">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {previewText || '无内容'}
                </pre>
              </div>
            </ScrollArea>
          </div>

          {/* Copy Progress */}
          {(isCopying || copyStatus !== 'idle') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{getStatusText()}</span>
                <span className="text-sm text-muted-foreground">
                  {copyProgress > 0 && `${copyProgress}%`}
                </span>
              </div>
              <Progress value={copyProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCopying}
          >
            取消
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!combinedText || isCopying || copyStatus === 'success'}
            className="min-w-[120px]"
          >
            <span className="flex items-center gap-2">
              {getStatusIcon()}
              {copyStatus === 'success' ? '已复制' : '复制到剪贴板'}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BatchCopyDialog;