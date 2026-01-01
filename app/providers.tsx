'use client';

import { AuthProvider } from '@/context/AuthContext';
import { DocumentsProvider } from '@/context/DocumentsContext';
import { ToastProvider } from '@/context/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <DocumentsProvider>
          {children}
          <ToastContainer />
        </DocumentsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
