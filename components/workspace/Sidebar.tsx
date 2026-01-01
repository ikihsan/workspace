'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useDocuments } from '@/context/DocumentsContext';
import { useToast } from '@/context/ToastContext';
import {
  X,
  FileText,
  Settings,
  LogOut,
  HelpCircle,
  Moon,
  Sun,
  Folder,
} from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { documents } = useDocuments();
  const { success, error: showError } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      success('Signed out', 'See you next time!');
    } catch (err) {
      showError('Sign out failed', 'Please try again');
    }
  };

  // Calculate storage stats
  const totalSize = documents.reduce((acc, doc) => acc + doc.fileSize, 0);
  const fileCount = documents.length;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            DocSpace
          </span>
        </div>
        {isMobile && (
          <button onClick={onClose} className="btn-icon btn-ghost -mr-2">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || 'User'}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-primary-600 dark:text-primary-400 font-medium">
                  {user.displayName?.[0] || user.email?.[0] || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {user.displayName || 'User'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Folder className="w-4 h-4" />
              <span className="text-xs">Files</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {fileCount}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Storage</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatFileSize(totalSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium">
          <FileText className="w-5 h-5" />
          All Documents
        </button>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <HelpCircle className="w-5 h-5" />
          Help & Support
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Settings className="w-5 h-5" />
          Settings
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  // Mobile: Slide-over drawer
  if (isMobile) {
    return (
      <Transition show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 z-50">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 shadow-soft-lg safe-top safe-bottom safe-left">
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 hidden md:block">
      <SidebarContent />
    </aside>
  );
}
