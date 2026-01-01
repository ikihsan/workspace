'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '@/context/AuthContext';
import {
  Menu as MenuIcon,
  Grid3X3,
  List,
  SortAsc,
  Calendar,
  FileText,
  HardDrive,
  ChevronDown,
} from 'lucide-react';
import { UploadButton } from './UploadButton';
import { ViewMode, SortConfig, SortOption, SortDirection } from '@/types';

interface HeaderProps {
  onMenuClick: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
  isMobile: boolean;
}

export function Header({
  onMenuClick,
  viewMode,
  onViewModeChange,
  sortConfig,
  onSortChange,
  isMobile,
}: HeaderProps) {
  const { user } = useAuth();

  const sortOptions: { option: SortOption; label: string; icon: typeof Calendar }[] = [
    { option: 'date', label: 'Date', icon: Calendar },
    { option: 'name', label: 'Name', icon: FileText },
    { option: 'size', label: 'Size', icon: HardDrive },
  ];

  const handleSortClick = (option: SortOption) => {
    if (sortConfig.option === option) {
      // Toggle direction
      onSortChange({
        option,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // New sort option, default to desc
      onSortChange({ option, direction: 'desc' });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-safe border-b border-gray-100 dark:border-gray-800 safe-top">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={onMenuClick}
              className="btn-icon btn-ghost -ml-2"
              aria-label="Open menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          )}

          {/* Title */}
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
              My Documents
            </h1>
            {!isMobile && user && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome back, {user.displayName?.split(' ')[0]}
              </p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Desktop Upload Button */}
          {!isMobile && <UploadButton variant="button" />}

          {/* View Toggle - Desktop only */}
          {!isMobile && (
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-500'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-500'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sort Menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="btn-ghost btn-sm gap-1.5">
              <SortAsc className="w-4 h-4" />
              {!isMobile && (
                <>
                  <span className="text-sm">
                    {sortOptions.find((s) => s.option === sortConfig.option)?.label}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-soft-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-50">
                <div className="p-1">
                  {sortOptions.map(({ option, label, icon: Icon }) => (
                    <Menu.Item key={option}>
                      {({ active }) => (
                        <button
                          onClick={() => handleSortClick(option)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            text-sm transition-colors
                            ${active ? 'bg-gray-50 dark:bg-gray-800' : ''}
                            ${
                              sortConfig.option === option
                                ? 'text-primary-500 font-medium'
                                : 'text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                          {sortConfig.option === option && (
                            <span className="ml-auto text-xs text-gray-400">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}
