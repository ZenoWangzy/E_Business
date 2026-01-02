/**
 * SSE Hook for real-time updates from image generation tasks
 */

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useEditorActions, useEditorItems } from '@/stores/editorStore';
import { SSEMessage, AssetType } from '@/types/editor';

interface UseSSEOptions {
  workspaceId: string;
  taskId?: string;
  onComplete?: (results: any[]) => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export const useSSE = ({
  workspaceId,
  taskId,
  onComplete,
  onError,
  autoReconnect = true,
  reconnectAttempts = 3,
  reconnectDelay = 3000
}: UseSSEOptions) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const { addItem, setLoading, setError, setTaskId } = useEditorActions();
  const items = useEditorItems();

  // Parse SSE message
  const parseSSEMessage = useCallback((data: string): SSEMessage | null => {
    try {
      const lines = data.split('\n');
      let eventType = '';
      let eventData = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.replace('event:', '').trim();
        } else if (line.startsWith('data:')) {
          eventData = line.replace('data:', '').trim();
        }
      }

      if (!eventData) return null;

      const parsedData = JSON.parse(eventData);
      return {
        taskId: parsedData.taskId,
        event: eventType as any,
        data: parsedData,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
      return null;
    }
  }, []);

  // Handle SSE message
  const handleMessage = useCallback((message: SSEMessage) => {
    if (!isMountedRef.current) return;

    switch (message.event) {
      case 'status':
        if (message.data.status === 'connected') {
          console.log('Connected to SSE stream');
        }
        break;

      case 'progress':
        setLoading(true);
        setError(null);
        // Optionally update progress UI
        console.log(`Progress: ${message.data.progress}% - ${message.data.message}`);
        break;

      case 'completed':
        setLoading(false);
        setError(null);

        // Add completed items to the store
        if (message.data.results && Array.isArray(message.data.results)) {
          const newItems = message.data.results.map((result: any, index: number) => ({
            id: result.id || `result-${Date.now()}-${index}`,
            src: result.url,
            title: `Generated Image ${items.length + index + 1}`,
            type: result.type === 'svg' ? AssetType.SVG : AssetType.IMAGE,
            metadata: {
              originalUrl: result.url,
              dimensions: result.metadata?.dimensions
            }
          }));

          newItems.forEach(item => addItem(item));

          // Show success toast
          toast.success('图片生成完成！', {
            description: `成功生成 ${newItems.length} 张图片`
          });

          // Call completion callback
          if (onComplete) {
            onComplete(message.data.results);
          }
        }
        break;

      case 'error':
        setLoading(false);
        const errorMessage = message.data.error || message.data.message || '生成失败';
        setError(errorMessage);

        toast.error('图片生成失败', {
          description: errorMessage
        });

        if (onError) {
          onError(errorMessage);
        }
        break;

      case 'close':
        setLoading(false);
        console.log('SSE stream closed');
        break;

      default:
        console.log('Unknown SSE event:', message.event);
    }
  }, [addItem, setLoading, setError, items.length, onComplete, onError]);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (!taskId) {
      console.warn('No taskId provided for SSE connection');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Set task ID in store
    setTaskId(taskId);

    // Create new EventSource
    const url = `/api/v1/images/workspaces/${workspaceId}/stream/${taskId}`;
    eventSourceRef.current = new EventSource(url);

    // Event handlers
    eventSourceRef.current.onopen = () => {
      console.log('SSE connection opened');
      reconnectCountRef.current = 0;
    };

    eventSourceRef.current.onmessage = (event) => {
      const message = parseSSEMessage(event.data);
      if (message) {
        handleMessage(message);
      }
    };

    eventSourceRef.current.onerror = (event) => {
      console.error('SSE connection error:', event);

      // Attempt reconnection if enabled and within limits
      if (autoReconnect && reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        console.log(`Attempting reconnection ${reconnectCountRef.current}/${reconnectAttempts}`);

        setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, reconnectDelay);
      } else {
        setLoading(false);
        setError('连接失败，请刷新页面重试');
      }
    };

    eventSourceRef.current.onclose = () => {
      console.log('SSE connection closed');
      eventSourceRef.current = null;
    };
  }, [
    taskId,
    workspaceId,
    autoReconnect,
    reconnectAttempts,
    reconnectDelay,
    setTaskId,
    parseSSEMessage,
    handleMessage
  ]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setLoading(false);
  }, [setLoading]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    connect();
  }, [connect]);

  // Effect: Connect when taskId changes
  useEffect(() => {
    if (taskId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [taskId, connect, disconnect]);

  // Effect: Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected: !!eventSourceRef.current,
    reconnectCount: reconnectCountRef.current,
    connect,
    disconnect,
    reconnect
  };
};

// Export a simpler hook for just connecting without extra options
export const useTaskSSE = (workspaceId: string, taskId?: string) => {
  return useSSE({
    workspaceId,
    taskId
  });
};