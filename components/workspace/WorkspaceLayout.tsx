'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDocuments } from '@/context/DocumentsContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DocumentList } from './DocumentList';
import { UploadButton } from './UploadButton';
import { FilePreview } from '../preview/FilePreview';
import { UploadProgressBar } from './UploadProgressBar';
import { ViewMode, SortConfig } from '@/types';

export function WorkspaceLayout() {
  const { user } = useAuth();
  const { selectedDocument, setSelectedDocument, uploadProgress } = useDocuments();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    option: 'date',
    direction: 'desc',
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Handle escape key for preview
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedDocument) {
        setSelectedDocument(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedDocument, setSelectedDocument]);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-gray-950">
      {/* Sidebar - Desktop */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <div className={`${!isMobile ? 'md:ml-64' : ''} min-h-screen flex flex-col`}>
        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
          isMobile={isMobile}
        />

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <UploadProgressBar items={uploadProgress} />
        )}

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          <DocumentList viewMode={viewMode} sortConfig={sortConfig} />
        </main>

        {/* Mobile Upload FAB */}
        {isMobile && (
          <div className="fixed bottom-6 right-6 z-40 safe-bottom">
            <UploadButton variant="fab" />
          </div>
        )}
      </div>

      {/* File Preview */}
      {selectedDocument && (
        <FilePreview
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
