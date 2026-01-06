/**
 * File Upload Section Component
 * Client component that integrates SmartDropzone into Dashboard (AC: 173-177)
 * Includes batch operations support
 */
'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { SmartDropzone } from '@/components/business/SmartDropzone';
import { FileList } from '@/components/business/FileList';
import { BatchOperationsBar } from '@/components/business/BatchOperationsBar';
import { useWorkspace } from '@/components/workspace';
import { deleteAsset } from '@/lib/api/assets';
import type { ParsedFile, FileError } from '@/types/file';
import { useWizardStore } from '@/stores/wizardStore';

export function FileUploadSection() {
    const { data: session } = useSession();
    const { currentWorkspace } = useWorkspace();
    const [uploadedFiles, setUploadedFiles] = useState<ParsedFile[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const { setCurrentAssetId } = useWizardStore();

    // Get access token from session (accessToken is in session.user.accessToken)
    const token = session?.user?.accessToken || '';

    // If no workspace selected, show message
    if (!currentWorkspace) {
        return (
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
                <h3 className="text-lg font-semibold text-white mb-2">文件上传</h3>
                <p className="text-neutral-400 text-sm">
                    请先选择一个工作空间以开始上传文件
                </p>
            </div>
        );
    }

    const handleFilesAdded = (files: ParsedFile[]) => {
        console.log('Files added:', files);
    };

    const handleUploadComplete = (file: ParsedFile) => {
        setUploadedFiles((prev) => [...prev, file]);
        // Auto-select the newly uploaded file as current asset
        setCurrentAssetId(file.id);
        console.log('Upload complete:', file);
    };

    const handleUploadError = (file: ParsedFile, error: FileError) => {
        console.error('Upload error:', file.name, error);
    };

    const handleRemoveFile = useCallback(async (fileId: string) => {
        if (!token || !currentWorkspace) return;

        try {
            await deleteAsset(currentWorkspace.id, fileId, token);
            setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(fileId);
                // Clear current asset if it was deleted
                if (fileId === useWizardStore.getState().currentAssetId) {
                    setCurrentAssetId(null);
                }
                return next;
            });
        } catch (error) {
            console.error('Failed to delete file:', error);
        }
    }, [currentWorkspace, token]);

    const handleBatchDelete = useCallback(async () => {
        if (selectedIds.size === 0 || !token || !currentWorkspace) return;

        setIsDeleting(true);
        try {
            const deletePromises = Array.from(selectedIds).map((id) =>
                deleteAsset(currentWorkspace.id, id, token).catch((err) => {
                    console.error(`Failed to delete ${id}:`, err);
                    return null;
                })
            );
            await Promise.all(deletePromises);

            setUploadedFiles((prev) =>
                prev.filter((f) => !selectedIds.has(f.id))
            );
            setSelectedIds(new Set());
        } finally {
            setIsDeleting(false);
        }
    }, [selectedIds, currentWorkspace, token]);

    const handleClearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    // Updated selection handler to sync with store
    const handleSelectionChange = useCallback((newSelectedIds: Set<string>) => {
        setSelectedIds(newSelectedIds);
        // If selection changes, update currentAssetId to the first selected item
        if (newSelectedIds.size > 0) {
            const firstId = Array.from(newSelectedIds)[0];
            setCurrentAssetId(firstId);
        } else {
            // Keep the last active one or clear?
            // Let's clear if nothing is selected manually, to be safe, BUT
            // usually we might want to keep the uploaded file context.
            // For now, let's say if user explicitly deselects everything, clear context.
            setCurrentAssetId(null);
        }
    }, [setCurrentAssetId]);


    const handlePreview = useCallback((file: ParsedFile) => {
        // Open preview modal or panel
        console.log('Preview file:', file.name);
        // Also set as current context
        setCurrentAssetId(file.id);
        // TODO: Implement preview modal
    }, [setCurrentAssetId]);

    return (
        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
            <h3 className="text-lg font-semibold text-white mb-4">文件上传</h3>

            <SmartDropzone
                workspaceId={currentWorkspace.id}
                token={token}
                onFilesAdded={handleFilesAdded}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={5}
            />

            {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-4">
                    {/* Batch operations bar */}
                    <BatchOperationsBar
                        selectedCount={selectedIds.size}
                        totalCount={uploadedFiles.length}
                        onClearSelection={handleClearSelection}
                        onBatchDelete={handleBatchDelete}
                        isDeleting={isDeleting}
                    />

                    {/* File list with selection */}
                    <FileList
                        files={uploadedFiles}
                        workspaceId={currentWorkspace.id}
                        selectable={true}
                        selectedIds={selectedIds}
                        onSelectionChange={handleSelectionChange}
                        onRemove={handleRemoveFile}
                        onPreview={handlePreview}
                        className="bg-neutral-800/50 rounded-lg p-4"
                    />
                </div>
            )}
        </div>
    );
}
