'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { DocumentFile, DocumentsState, UploadProgress } from '@/types';
import { useAuth } from './AuthContext';
import {
  getUserDocuments,
  createDocument,
  deleteDocument as firestoreDeleteDocument,
  updateDocument,
} from '@/lib/firestore';
import { uploadToIPFS } from '@/lib/ipfs';
import { validateFile, generateId } from '@/lib/utils';

interface DocumentsContextType extends DocumentsState {
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  setSelectedDocument: (doc: DocumentFile | null) => void;
  uploadProgress: UploadProgress[];
  clearUploadProgress: (fileName: string) => void;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

interface DocumentsProviderProps {
  children: ReactNode;
}

export function DocumentsProvider({ children }: DocumentsProviderProps) {
  const { user } = useAuth();
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    error: null,
    selectedDocument: null,
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  // Fetch user documents
  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setState({
        documents: [],
        loading: false,
        error: null,
        selectedDocument: null,
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const docs = await getUserDocuments(user.uid);
      setState((prev) => ({
        ...prev,
        documents: docs,
        loading: false,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch documents';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [user]);

  // Load documents when user changes
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Upload a file
  const uploadFile = useCallback(
    async (file: File) => {
      if (!user) {
        throw new Error('Must be authenticated to upload files');
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const progressId = generateId();

      // Initialize progress
      setUploadProgress((prev) => [
        ...prev,
        {
          fileName: file.name,
          progress: 0,
          status: 'uploading',
        },
      ]);

      try {
        // Upload to IPFS
        const { cid, url } = await uploadToIPFS(file, (progress) => {
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.fileName === file.name
                ? { ...p, progress, status: progress < 100 ? 'uploading' : 'processing' }
                : p
            )
          );
        });

        // Update progress to processing
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name ? { ...p, status: 'processing' } : p
          )
        );

        // Save metadata to Firestore
        const newDoc = await createDocument(user.uid, {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          ipfsCID: cid,
          ipfsURL: url,
        });

        // Update local state
        setState((prev) => ({
          ...prev,
          documents: [newDoc, ...prev.documents],
        }));

        // Mark as complete
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name
              ? { ...p, progress: 100, status: 'complete' }
              : p
          )
        );

        // Remove from progress after delay
        setTimeout(() => {
          setUploadProgress((prev) => prev.filter((p) => p.fileName !== file.name));
        }, 2000);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name
              ? { ...p, status: 'error', error: errorMessage }
              : p
          )
        );
        throw error;
      }
    },
    [user]
  );

  // Delete a file
  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!user) {
        throw new Error('Must be authenticated to delete files');
      }

      try {
        await firestoreDeleteDocument(fileId, user.uid);
        setState((prev) => ({
          ...prev,
          documents: prev.documents.filter((doc) => doc.fileId !== fileId),
          selectedDocument:
            prev.selectedDocument?.fileId === fileId ? null : prev.selectedDocument,
        }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [user]
  );

  // Rename a file
  const renameFile = useCallback(
    async (fileId: string, newName: string) => {
      if (!user) {
        throw new Error('Must be authenticated to rename files');
      }

      try {
        await updateDocument(fileId, user.uid, { fileName: newName });
        setState((prev) => ({
          ...prev,
          documents: prev.documents.map((doc) =>
            doc.fileId === fileId ? { ...doc, fileName: newName } : doc
          ),
          selectedDocument:
            prev.selectedDocument?.fileId === fileId
              ? { ...prev.selectedDocument, fileName: newName }
              : prev.selectedDocument,
        }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to rename file';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [user]
  );

  // Set selected document
  const setSelectedDocument = useCallback((doc: DocumentFile | null) => {
    setState((prev) => ({ ...prev, selectedDocument: doc }));
  }, []);

  // Clear upload progress
  const clearUploadProgress = useCallback((fileName: string) => {
    setUploadProgress((prev) => prev.filter((p) => p.fileName !== fileName));
  }, []);

  const value: DocumentsContextType = {
    ...state,
    uploadFile,
    deleteFile,
    renameFile,
    refreshDocuments: fetchDocuments,
    setSelectedDocument,
    uploadProgress,
    clearUploadProgress,
  };

  return (
    <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>
  );
}

export function useDocuments(): DocumentsContextType {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
}
