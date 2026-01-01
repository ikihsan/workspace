// User type from Firebase Auth
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Document file metadata stored in Firestore
export interface DocumentFile {
  fileId: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  ipfsCID: string;
  ipfsURL: string;
  createdAt: Date;
  updatedAt?: Date;
}

// File upload progress state
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// Supported file types for preview
export type PreviewableType = 'pdf' | 'image' | 'text' | 'unsupported';

// File type configuration
export interface FileTypeConfig {
  type: PreviewableType;
  icon: string;
  color: string;
  extensions: string[];
  mimeTypes: string[];
}

// Toast notification types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

// Auth context state
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Documents context state
export interface DocumentsState {
  documents: DocumentFile[];
  loading: boolean;
  error: string | null;
  selectedDocument: DocumentFile | null;
}

// View modes for document list
export type ViewMode = 'grid' | 'list';

// Sort options
export type SortOption = 'name' | 'date' | 'size';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  option: SortOption;
  direction: SortDirection;
}
