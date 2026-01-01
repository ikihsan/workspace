'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { FileText, Shield, Smartphone, Cloud, ArrowRight } from 'lucide-react';

export function LandingPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  const handleGetStarted = () => {
    router.push('/auth');
  };

  const features = [
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your documents are encrypted and only accessible by you.',
    },
    {
      icon: Smartphone,
      title: 'Mobile First',
      description: 'Designed for mobile devices with touch-friendly interface.',
    },
    {
      icon: Cloud,
      title: 'Decentralized Storage',
      description: 'Files stored on IPFS for reliability and permanence.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-hidden">
      {/* Header */}
      <header className="safe-top">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              DocSpace
            </span>
          </div>
          <button onClick={handleGetStarted} className="btn-primary btn-sm">
            Sign In
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-12 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            Now with IPFS Storage
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Your Personal
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-blue-400 bg-clip-text text-transparent">
              Document Workspace
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            A secure, beautiful, mobile-first workspace where you can upload,
            preview, and manage all your documents seamlessly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={handleGetStarted}
              className="btn-primary btn-lg gap-2 w-full sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="btn-secondary btn-lg w-full sm:w-auto">
              Learn More
            </button>
          </div>

          {/* Hero Image / Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative max-w-4xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-blue-500/20 rounded-3xl blur-3xl transform -rotate-1" />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-soft-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
              {/* Mock App Preview */}
              <div className="p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary" />
                    <div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded mt-1" />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30" />
                </div>

                {/* File Cards */}
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl ${
                          i === 1
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : i === 2
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded mt-2" />
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="card p-6 hover:shadow-soft-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 mt-12 border-t border-gray-100 dark:border-gray-800 safe-bottom">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 DocSpace. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary-500 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary-500 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-primary-500 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
