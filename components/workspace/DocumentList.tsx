'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocuments } from '@/context/DocumentsContext';
import { DocumentCard } from './DocumentCard';
import { DocumentGridCard } from './DocumentGridCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DocumentListSkeleton, DocumentGridSkeleton } from '@/components/ui/Skeleton';
import { ViewMode, SortConfig, DocumentFile } from '@/types';

interface DocumentListProps {
  viewMode: ViewMode;
  sortConfig: SortConfig;
}

export function DocumentList({ viewMode, sortConfig }: DocumentListProps) {
  const { documents, loading, error, setSelectedDocument } = useDocuments();

  // Sort documents
  const sortedDocuments = useMemo(() => {
    const sorted = [...documents];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.option) {
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case 'date':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'size':
          comparison = b.fileSize - a.fileSize;
          break;
      }
      
      return sortConfig.direction === 'asc' ? -comparison : comparison;
    });
    
    return sorted;
  }, [documents, sortConfig]);

  const handleDocumentClick = (doc: DocumentFile) => {
    setSelectedDocument(doc);
  };

  // Loading state
  if (loading) {
    return viewMode === 'list' ? (
      <DocumentListSkeleton count={5} />
    ) : (
      <DocumentGridSkeleton count={6} />
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Something went wrong
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <EmptyState
        title="No documents yet"
        description="Upload your first document to get started. We support PDFs, images, and text files."
      />
    );
  }

  // List view
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedDocuments.map((doc, index) => (
            <motion.div
              key={doc.fileId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <DocumentCard
                document={doc}
                onClick={() => handleDocumentClick(doc)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <AnimatePresence mode="popLayout">
        {sortedDocuments.map((doc, index) => (
          <motion.div
            key={doc.fileId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <DocumentGridCard
              document={doc}
              onClick={() => handleDocumentClick(doc)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
