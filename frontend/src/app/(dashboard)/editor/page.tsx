'use client';
/**
 * Editor page - Main interface for viewing and organizing generated images
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import EditorGrid from '@/components/business/EditorGrid';
import { Toaster } from 'sonner';
import { useEditorItems, useEditorActions, useEditorLoading, useEditorError } from '@/stores/editorStore';
import { useTaskSSE } from '@/hooks/useSSE';
import { TextOverlay } from '@/types/editor';

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = params.id as string;
  const taskId = searchParams?.get('taskId') || undefined;

  // Store hooks
  const items = useEditorItems();
  const isLoading = useEditorLoading();
  const error = useEditorError();
  const { clearItems, removeItem, reorderItems } = useEditorActions();

  // SSE connection
  const { isConnected } = useTaskSSE(workspaceId, taskId);

  // Local state for modal/dialog
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Handle item actions
  const handleEditItem = (id: string, overlays: TextOverlay[]) => {
    console.log('Edit item:', id, overlays);
    // TODO: Implement text overlay editing modal
  };

  const handleDeleteItem = (id: string) => {
    const item = items.find(item => item.id === id);
    if (item && confirm(`确定要删除 "${item.title}" 吗？`)) {
      removeItem(id);
    }
  };

  const handleViewFull = (imageSrc: string) => {
    // Open image in full screen modal or new tab
    window.open(imageSrc, '_blank');
  };

  const handleReorder = (oldIndex: number, newIndex: number) => {
    reorderItems(oldIndex, newIndex);
  };

  // Clear items when workspace changes
  useEffect(() => {
    if (workspaceId) {
      // Optionally load existing items for this workspace
      // clearItems();
    }
  }, [workspaceId]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              图片编辑器
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {taskId ? (
                <span>
                  任务ID: {taskId}
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isConnected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isConnected ? '已连接' : '连接中...'}
                  </span>
                </span>
              ) : (
                '拖拽图片到这里开始编辑'
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {items.length} 个项目
            </div>
            {error && (
              <div className="text-sm text-red-600">
                错误: {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        {items.length === 0 && !isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                还没有图片
              </h3>
              <p className="text-gray-600">
                开始生成图片后，它们会出现在这里
              </p>
              {taskId && (
                <div className="mt-4">
                  <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    等待图片生成...
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EditorGrid
            items={items}
            onReorder={handleReorder}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onViewFull={handleViewFull}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        expand={false}
        richColors
      />
    </div>
  );
}