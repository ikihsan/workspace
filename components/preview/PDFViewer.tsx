'use client';

import { useState } from 'react';
import { Loader2, ExternalLink, Download } from 'lucide-react';

interface PDFViewerProps {
  url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Use Google Docs Viewer for universal PDF viewing
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  const handleOpenExternal = () => {
    window.open(googleViewerUrl.replace('&embedded=true', ''), '_blank');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
          <span className="text-2xl">📄</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Preview unavailable
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-6">
          This PDF cannot be displayed inline. You can open it in a new tab or download it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleOpenExternal} className="btn-secondary gap-2">
            <ExternalLink className="w-4 h-4" />
            Open in Viewer
          </button>
          <button onClick={handleDownload} className="btn-primary gap-2">
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Actions bar */}
      <div className="sticky top-0 z-10 flex items-center justify-end gap-2 px-4 py-2 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
        <button onClick={handleOpenExternal} className="btn-ghost btn-sm gap-2">
          <ExternalLink className="w-4 h-4" />
          Open in new tab
        </button>
        <button onClick={handleDownload} className="btn-ghost btn-sm gap-2">
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>

      {/* PDF Content */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading PDF...</p>
          </div>
        )}

        <iframe
          src={googleViewerUrl}
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full border-0"
          title="PDF Viewer"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
