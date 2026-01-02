'use client';

/**
 * CopyHistoryPanel Component
 *
 * Displays and manages clipboard copy history:
 * - List all copy entries
 * - Search functionality
 * - Quick re-copy
 * - Export/import history
 * - Clear history
 */

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  History,
  Search,
  Copy,
  Trash2,
  Download,
  Upload,
  X,
  Clock,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCopyHistory } from '@/stores/copyHistory';
import { CopyButton } from '@/components/ui/copy-button';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface CopyHistoryPanelProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CopyHistoryPanel({
  trigger,
  open,
  onOpenChange,
}: CopyHistoryPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    entries,
    searchQuery,
    entryCount,
    filteredCount,
    setSearchQuery,
    removeEntry,
    clearHistory,
    exportHistory,
    importHistory,
  } = useCopyHistory();

  // Handle export
  const handleExport = () => {
    try {
      const data = exportHistory();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `copy-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Handle import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        importHistory(content);
      } catch (error) {
        console.error('Import failed:', error);
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle clear history
  const handleClearHistory = () => {
    if (confirm('确定要清空所有复制历史吗？此操作不可撤销。')) {
      clearHistory();
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <History className="h-4 w-4 mr-2" />
      复制历史
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            复制历史
          </DialogTitle>
          <DialogDescription>
            查看和管理您的复制历史记录 ({entryCount} 条)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search and Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索复制历史..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  操作
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  导出历史
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  导入历史
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearHistory} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  清空历史
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          {/* History List */}
          <ScrollArea className="flex-1">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">暂无复制历史</p>
                <p className="text-xs">复制的内容将显示在这里</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchQuery && filteredCount === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    没有找到匹配的内容
                  </div>
                )}

                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'group relative p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800',
                      'transition-colors duration-200'
                    )}
                  >
                    {/* Entry Content */}
                    <div className="pr-20">
                      <div className="text-sm font-mono line-clamp-3 mb-2">
                        {entry.content}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(entry.timestamp, {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                        {entry.truncated && (
                          <span className="text-orange-600">• 分段复制</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <CopyButton
                        text={entry.content}
                        variant="icon"
                        size="sm"
                        tooltip="复制"
                        className="h-8 w-8"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeEntry(entry.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="删除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {searchQuery && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    显示 {filteredCount} / {entryCount} 条记录
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {entryCount > 0 && `共 ${entryCount} 条历史记录`}
          </div>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CopyHistoryPanel;