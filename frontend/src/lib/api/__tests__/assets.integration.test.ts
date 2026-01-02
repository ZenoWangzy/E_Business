/**
 * Asset API Integration Tests
 * Tests that align with the actual API implementation signature
 */

import { uploadAsset, listAssets, deleteAsset } from '../assets';

// Mock XMLHttpRequest for uploadAsset
const mockXHR = {
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  upload: {
    addEventListener: jest.fn(),
  },
  addEventListener: jest.fn(),
  status: 200,
  responseText: '',
};

// Mock fetch for listAssets and deleteAsset
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('assets API integration', () => {
  const testWorkspaceId = 'test-workspace-id';
  const testToken = 'test-auth-token';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset XHR mock
    (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = jest.fn(() => mockXHR);
  });

  describe('uploadAsset', () => {
    test('uploads file with correct parameters', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockResponse = {
        id: 'asset-123',
        workspaceId: testWorkspaceId,
        name: 'test.pdf',
        size: 12,
        mimeType: 'application/pdf',
        createdAt: '2025-12-15T00:00:00Z',
      };

      // Setup XHR to simulate successful upload
      mockXHR.status = 201;
      mockXHR.responseText = JSON.stringify(mockResponse);
      mockXHR.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          setTimeout(() => handler(), 0);
        }
      });

      const progressCallback = jest.fn();
      const resultPromise = uploadAsset(mockFile, testWorkspaceId, testToken, progressCallback);

      // Simulate progress
      const progressHandler = mockXHR.upload.addEventListener.mock.calls.find(
        (call) => call[0] === 'progress'
      )?.[1];
      if (progressHandler) {
        progressHandler({ lengthComputable: true, loaded: 50, total: 100 });
      }

      const result = await resultPromise;

      expect(mockXHR.open).toHaveBeenCalledWith(
        'POST',
        `/api/v1/workspaces/${testWorkspaceId}/assets`
      );
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith(
        'Authorization',
        `Bearer ${testToken}`
      );
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith(
        'X-Workspace-ID',
        testWorkspaceId
      );
      expect(result).toEqual(mockResponse);
    });

    test('handles upload error', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      mockXHR.status = 400;
      mockXHR.responseText = JSON.stringify({ detail: 'Invalid file' });
      mockXHR.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          setTimeout(() => handler(), 0);
        }
      });

      await expect(
        uploadAsset(mockFile, testWorkspaceId, testToken)
      ).rejects.toThrow('Invalid file');
    });

    test('handles network error', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      mockXHR.addEventListener.mockImplementation((event, handler) => {
        if (event === 'error') {
          setTimeout(() => handler(), 0);
        }
      });

      await expect(
        uploadAsset(mockFile, testWorkspaceId, testToken)
      ).rejects.toThrow('Network error occurred during upload');
    });
  });

  describe('listAssets', () => {
    test('fetches assets list', async () => {
      const mockAssets = {
        assets: [
          {
            id: '1',
            workspaceId: testWorkspaceId,
            name: 'document1.pdf',
            size: 1024,
            mimeType: 'application/pdf',
            createdAt: '2025-12-15T00:00:00Z',
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAssets,
      } as Response);

      const result = await listAssets(testWorkspaceId, testToken);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/workspaces/${testWorkspaceId}/assets`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${testToken}`,
            'X-Workspace-ID': testWorkspaceId,
          },
        }
      );

      expect(result).toEqual(mockAssets);
    });

    test('handles empty assets list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ assets: [], total: 0 }),
      } as Response);

      const result = await listAssets(testWorkspaceId, testToken);
      expect(result.assets).toEqual([]);
    });

    test('handles API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal server error' }),
      } as Response);

      await expect(
        listAssets(testWorkspaceId, testToken)
      ).rejects.toThrow('Internal server error');
    });
  });

  describe('deleteAsset', () => {
    test('deletes asset successfully', async () => {
      const assetId = 'asset-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as Response);

      await deleteAsset(testWorkspaceId, assetId, testToken);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/workspaces/${testWorkspaceId}/assets/${assetId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${testToken}`,
            'X-Workspace-ID': testWorkspaceId,
          },
        }
      );
    });

    test('handles not found error', async () => {
      const assetId = 'nonexistent-asset';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Asset not found' }),
      } as Response);

      await expect(
        deleteAsset(testWorkspaceId, assetId, testToken)
      ).rejects.toThrow('Asset not found');
    });

    test('handles unauthorized access', async () => {
      const assetId = 'asset-456';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'Access denied' }),
      } as Response);

      await expect(
        deleteAsset(testWorkspaceId, assetId, testToken)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('Authentication handling', () => {
    test('handles expired token error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Token has expired' }),
      } as Response);

      await expect(
        listAssets(testWorkspaceId, 'expired-token')
      ).rejects.toThrow('Token has expired');
    });
  });
});