/**
 * useReferenceUpload hook tests
 * Story 2.4: Reference Image Attachment
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useReferenceUpload } from '@/hooks/useReferenceUpload';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@/lib/api/assets', () => ({
    uploadAssetViaMinIO: jest.fn(),
}));

import { uploadAssetViaMinIO } from '@/lib/api/assets';

const mockUploadAssetViaMinIO = uploadAssetViaMinIO as jest.MockedFunction<typeof uploadAssetViaMinIO>;

describe('useReferenceUpload', () => {
    const defaultOptions = {
        workspaceId: 'test-workspace-id',
        token: 'test-auth-token',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('初始状态', () => {
        it('应该初始化正确的状态', () => {
            const { result } = renderHook(() => useReferenceUpload(defaultOptions));

            expect(result.current.uploadState.isUploading).toBe(false);
            expect(result.current.uploadState.progress).toBe(0);
            expect(result.current.uploadState.error).toBeNull();
            expect(result.current.fileInputRef).toBeDefined();
        });
    });

    describe('文件验证', () => {
        it('应该拒绝非图片文件类型', async () => {
            const onError = jest.fn();
            const { result } = renderHook(() =>
                useReferenceUpload({ ...defaultOptions, onError })
            );

            const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

            await act(async () => {
                const event = {
                    target: { files: [invalidFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            expect(toast.error).toHaveBeenCalledWith('只支持 JPG 和 PNG 格式的图片');
            expect(onError).toHaveBeenCalled();
        });

        it('应该拒绝超过 5MB 的文件', async () => {
            const onError = jest.fn();
            const { result } = renderHook(() =>
                useReferenceUpload({ ...defaultOptions, onError })
            );

            // Create a mock file > 5MB
            const largeFile = new File(
                [new ArrayBuffer(6 * 1024 * 1024)],
                'large.jpg',
                { type: 'image/jpeg' }
            );
            Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

            await act(async () => {
                const event = {
                    target: { files: [largeFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            expect(toast.error).toHaveBeenCalledWith('文件大小不能超过 5MB');
            expect(onError).toHaveBeenCalled();
        });

        it('应该拒绝文件扩展名不匹配的文件', async () => {
            const onError = jest.fn();
            const { result } = renderHook(() =>
                useReferenceUpload({ ...defaultOptions, onError })
            );

            const invalidFile = new File(['test'], 'test.gif', { type: 'image/jpeg' });

            await act(async () => {
                const event = {
                    target: { files: [invalidFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            expect(toast.error).toHaveBeenCalledWith('文件扩展名不正确');
        });

        it('应该接受有效的 JPG 文件', async () => {
            const onSuccess = jest.fn();
            mockUploadAssetViaMinIO.mockResolvedValue({
                id: 'test-asset-id',
                workspaceId: 'test-workspace-id',
                name: 'test.jpg',
                size: 1024,
                mimeType: 'image/jpeg',
                createdAt: new Date().toISOString(),
            });

            const { result } = renderHook(() =>
                useReferenceUpload({ ...defaultOptions, onSuccess })
            );

            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

            await act(async () => {
                const event = {
                    target: { files: [validFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            await waitFor(() => {
                expect(mockUploadAssetViaMinIO).toHaveBeenCalled();
            });
        });

        it('应该接受有效的 PNG 文件', async () => {
            mockUploadAssetViaMinIO.mockResolvedValue({
                id: 'test-asset-id',
                workspaceId: 'test-workspace-id',
                name: 'test.png',
                size: 1024,
                mimeType: 'image/png',
                createdAt: new Date().toISOString(),
            });

            const { result } = renderHook(() => useReferenceUpload(defaultOptions));

            const validFile = new File(['test'], 'test.png', { type: 'image/png' });

            await act(async () => {
                const event = {
                    target: { files: [validFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            await waitFor(() => {
                expect(mockUploadAssetViaMinIO).toHaveBeenCalled();
            });
        });
    });

    describe('上传流程', () => {
        it('应该在上传时更新 isUploading 状态', async () => {
            let resolveUpload: (value: any) => void;
            const uploadPromise = new Promise((resolve) => {
                resolveUpload = resolve;
            });
            mockUploadAssetViaMinIO.mockReturnValue(uploadPromise as any);

            const { result } = renderHook(() => useReferenceUpload(defaultOptions));

            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

            act(() => {
                const event = {
                    target: { files: [validFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            // Check uploading state
            expect(result.current.uploadState.isUploading).toBe(true);

            // Resolve the upload
            await act(async () => {
                resolveUpload!({
                    id: 'test-asset-id',
                    workspaceId: 'test-workspace-id',
                    name: 'test.jpg',
                    size: 1024,
                    mimeType: 'image/jpeg',
                    createdAt: new Date().toISOString(),
                });
            });

            await waitFor(() => {
                expect(result.current.uploadState.isUploading).toBe(false);
            });
        });

        it('应该在上传成功后调用 onSuccess', async () => {
            const onSuccess = jest.fn();
            mockUploadAssetViaMinIO.mockResolvedValue({
                id: 'test-asset-id',
                workspaceId: 'test-workspace-id',
                name: 'test.jpg',
                size: 1024,
                mimeType: 'image/jpeg',
                createdAt: new Date().toISOString(),
            });

            const { result } = renderHook(() =>
                useReferenceUpload({ ...defaultOptions, onSuccess })
            );

            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

            await act(async () => {
                const event = {
                    target: { files: [validFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            await waitFor(() => {
                expect(onSuccess).toHaveBeenCalledWith(
                    expect.objectContaining({
                        assetId: 'test-asset-id',
                    })
                );
                expect(toast.success).toHaveBeenCalledWith('参考图片上传成功');
            });
        });

        it('应该在上传失败时调用 onError', async () => {
            const onError = jest.fn();
            mockUploadAssetViaMinIO.mockRejectedValue(new Error('Upload failed'));

            const { result } = renderHook(() =>
                useReferenceUpload({ ...defaultOptions, onError })
            );

            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

            await act(async () => {
                const event = {
                    target: { files: [validFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            await waitFor(() => {
                expect(onError).toHaveBeenCalled();
                expect(toast.error).toHaveBeenCalledWith('Upload failed');
                expect(result.current.uploadState.error).toBe('Upload failed');
            });
        });
    });

    describe('拖放支持', () => {
        it('应该处理有效文件的拖放', async () => {
            mockUploadAssetViaMinIO.mockResolvedValue({
                id: 'test-asset-id',
                workspaceId: 'test-workspace-id',
                name: 'test.jpg',
                size: 1024,
                mimeType: 'image/jpeg',
                createdAt: new Date().toISOString(),
            });

            const { result } = renderHook(() => useReferenceUpload(defaultOptions));

            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const mockEvent = {
                preventDefault: jest.fn(),
                dataTransfer: { files: [validFile] },
            } as unknown as React.DragEvent<HTMLDivElement>;

            await act(async () => {
                result.current.handleDrop(mockEvent);
            });

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            await waitFor(() => {
                expect(mockUploadAssetViaMinIO).toHaveBeenCalled();
            });
        });

        it('应该在 dragOver 时阻止默认行为', () => {
            const { result } = renderHook(() => useReferenceUpload(defaultOptions));

            const mockEvent = {
                preventDefault: jest.fn(),
            } as unknown as React.DragEvent<HTMLDivElement>;

            act(() => {
                result.current.handleDragOver(mockEvent);
            });

            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('状态重置', () => {
        it('应该能够重置上传状态', async () => {
            mockUploadAssetViaMinIO.mockRejectedValue(new Error('Upload failed'));

            const { result } = renderHook(() => useReferenceUpload(defaultOptions));

            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

            await act(async () => {
                const event = {
                    target: { files: [validFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                result.current.handleFileSelect(event);
            });

            await waitFor(() => {
                expect(result.current.uploadState.error).toBe('Upload failed');
            });

            act(() => {
                result.current.reset();
            });

            expect(result.current.uploadState.isUploading).toBe(false);
            expect(result.current.uploadState.progress).toBe(0);
            expect(result.current.uploadState.error).toBeNull();
        });
    });
});
