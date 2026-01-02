import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock messages for testing
const messages = {
  en: {
    fileUpload: {
      dragDrop: 'Drag and drop files here',
      orClick: 'or click to select',
      unsupportedType: 'Unsupported file type',
      fileTooLarge: 'File size exceeds limit',
      uploadSuccess: 'File uploaded successfully',
      uploadError: 'Upload failed',
      uploading: 'Uploading...',
      parsing: 'Parsing file...',
    },
  },
  zh: {
    fileUpload: {
      dragDrop: '拖放文件到此处',
      orClick: '或点击选择文件',
      unsupportedType: '不支持的文件类型',
      fileTooLarge: '文件大小超出限制',
      uploadSuccess: '文件上传成功',
      uploadError: '上传失败',
      uploading: '上传中...',
      parsing: '解析文件中...',
    },
  },
}

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
})

interface AllTheProvidersProps {
  children: React.ReactNode
  locale?: string
  queryClient?: QueryClient
}

const AllTheProviders = ({
  children,
  locale = 'en',
  queryClient = createTestQueryClient()
}: AllTheProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messages[locale as keyof typeof messages]}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  locale?: string
  queryClient?: QueryClient
}

const customRender = (
  ui: ReactElement,
  {
    locale = 'en',
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllTheProviders locale={locale} queryClient={queryClient}>
      {children}
    </AllTheProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock workspace context
export const createMockWorkspaceContext = (workspaceId: string = 'test-workspace-id') => ({
  workspaceId,
  userRole: 'OWNER' as const,
  permissions: ['read', 'write', 'delete'],
  refreshWorkspace: jest.fn(),
  isLoading: false,
})

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override render method
export { customRender as render }