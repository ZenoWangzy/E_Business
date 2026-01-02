/**
 * Mock file utility for testing file upload functionality
 */

export const createMockFile = (
  name: string,
  content: string = '',
  mimeType: string = 'text/plain',
  size?: number
): File => {
  const buffer = new ArrayBuffer(size || content.length)
  const view = new Uint8Array(buffer)

  for (let i = 0; i < content.length; i++) {
    view[i] = content.charCodeAt(i)
  }

  const file = new File([buffer], name, { type: mimeType })
  Object.defineProperty(file, 'size', { value: size || content.length })

  return file
}

// Common mock files for testing
export const mockFiles = {
  // Valid files
  pdf: createMockFile('test.pdf', '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n', 'application/pdf', 1024),
  docx: createMockFile('test.docx', 'PK\x03\x04\x14\x00\x06\x00', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2048),
  xlsx: createMockFile('test.xlsx', 'PK\x03\x04\x14\x00\x06\x00', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1536),
  png: createMockFile('test.png', '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00', 'image/png', 512),
  jpeg: createMockFile('test.jpg', '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01', 'image/jpeg', 768),
  txt: createMockFile('test.txt', 'This is a test text file', 'text/plain', 256),

  // Invalid files
  executable: createMockFile('malware.exe', 'MZ\x90\x00\x03\x00\x00\x00', 'application/x-executable', 4096),
  oversized: createMockFile('large.pdf', 'PDF content', 'application/pdf', 11 * 1024 * 1024), // 11MB

  // Empty file
  empty: createMockFile('empty.txt', '', 'text/plain', 0),
}

export const createMockDragEvent = (files: File[]) => {
  const dataTransfer = {
    files: {
      length: files.length,
      item: (index: number) => files[index],
      [Symbol.iterator]: function* () {
        for (const file of files) {
          yield file
        }
      },
    },
    items: files.map(file => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file
    })),
    types: ['Files'],
    getData: () => '',
    setData: () => { },
  }

  // Create a custom event since JSDOM doesn't support DragEvent
  const event = new Event('drop', {
    bubbles: true,
    cancelable: true,
  })

  // Add dataTransfer property
  Object.defineProperty(event, 'dataTransfer', {
    value: dataTransfer,
    writable: false
  })

  return event
}

export const createMockUploadProgress = () => {
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.random() * 20
    if (progress >= 100) {
      progress = 100
      clearInterval(interval)
    }
  }, 100)

  return { progress, complete: progress >= 100 }
}