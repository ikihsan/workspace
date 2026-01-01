import { FileTypeConfig, PreviewableType } from '@/types';

// File type configurations
export const FILE_TYPES: FileTypeConfig[] = [
  {
    type: 'pdf',
    icon: 'FileText',
    color: 'text-red-500',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
  },
  {
    type: 'image',
    icon: 'Image',
    color: 'text-green-500',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
    ],
  },
  {
    type: 'text',
    icon: 'FileText',
    color: 'text-blue-500',
    extensions: ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.js', '.ts', '.html', '.css'],
    mimeTypes: [
      'text/plain',
      'text/markdown',
      'application/json',
      'text/xml',
      'text/csv',
      'text/html',
      'text/css',
      'application/javascript',
      'text/javascript',
    ],
  },
];

// Get file type from mime type or extension
export function getFileType(mimeType: string, fileName: string): PreviewableType {
  // Check by mime type first
  for (const config of FILE_TYPES) {
    if (config.mimeTypes.includes(mimeType)) {
      return config.type;
    }
  }

  // Fallback to extension
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  for (const config of FILE_TYPES) {
    if (config.extensions.includes(extension)) {
      return config.type;
    }
  }

  return 'unsupported';
}

// Get file config by type
export function getFileConfig(type: PreviewableType): FileTypeConfig | undefined {
  return FILE_TYPES.find((config) => config.type === type);
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date for display
export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes === 0) return 'Just now';
      return `${minutes}m ago`;
    }
    return `${hours}h ago`;
  }

  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Validate file before upload
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = FILE_TYPES.flatMap((config) => config.mimeTypes);

export function validateFile(file: File): ValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds limit (${formatFileSize(MAX_FILE_SIZE)})`,
    };
  }

  // Check file type - allow most common types
  const isAllowedType = 
    ALLOWED_TYPES.includes(file.type) || 
    file.type.startsWith('text/') ||
    file.type.startsWith('image/') ||
    file.type === 'application/pdf';

  if (!isAllowedType && file.type !== '') {
    // Allow files with no type (some text files)
    console.warn(`File type ${file.type} is not in the allowed list, but will be accepted`);
  }

  return { valid: true };
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Truncate filename for display
export function truncateFileName(name: string, maxLength: number = 30): string {
  if (name.length <= maxLength) return name;

  const extension = name.substring(name.lastIndexOf('.'));
  const baseName = name.substring(0, name.lastIndexOf('.'));
  const truncatedBase = baseName.substring(0, maxLength - extension.length - 3);

  return `${truncatedBase}...${extension}`;
}
