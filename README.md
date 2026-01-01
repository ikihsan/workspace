# DocSpace - Personal Document Workspace

A secure, beautiful, mobile-first workspace for managing your documents. Built with Next.js, Firebase, and IPFS.

![DocSpace](https://img.shields.io/badge/DocSpace-v1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan)

## ✨ Features

- 🔐 **Google Sign-In** - One-tap authentication with Firebase
- 📱 **Mobile-First Design** - Touch-friendly, thumb-optimized UI
- 📄 **In-App Preview** - View PDFs, images, and text files directly
- ☁️ **Decentralized Storage** - Files stored on IPFS via Web3.Storage
- 🔒 **Secure Access** - Users can only see their own files
- 🎨 **Beautiful UI** - Modern blue & white SaaS design
- ⚡ **Fast & Smooth** - 60fps animations with Framer Motion

## 🛠 Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Headless UI / Radix UI**
- **Framer Motion**
- **React PDF**

### Backend / Services
- **Firebase Authentication** (Google Sign-In)
- **Firebase Firestore** (File metadata)
- **Web3.Storage** (IPFS file storage)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase account
- Web3.Storage account

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd docspace
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** and add **Google** as a sign-in provider
4. Create a **Firestore Database**
5. Go to Project Settings > General > Your apps > Add web app
6. Copy the configuration values

### 4. Set Up Web3.Storage

1. Go to [Web3.Storage](https://web3.storage/)
2. Create an account
3. Go to **Account** > **Create API Token**
4. Copy your API token

### 5. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Web3.Storage
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3_storage_token
```

### 6. Deploy Firestore Security Rules

Install Firebase CLI if you haven't:

```bash
npm install -g firebase-tools
firebase login
```

Update `.firebaserc` with your project ID, then deploy rules:

```bash
firebase deploy --only firestore:rules
```

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
docspace/
├── app/
│   ├── auth/
│   │   └── page.tsx          # Authentication page
│   ├── workspace/
│   │   └── page.tsx          # Main workspace
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   └── providers.tsx         # Context providers
├── components/
│   ├── auth/
│   │   └── AuthCard.tsx      # Google sign-in card
│   ├── landing/
│   │   └── LandingPage.tsx   # Landing/marketing page
│   ├── preview/
│   │   ├── FilePreview.tsx   # Main preview container
│   │   ├── PDFViewer.tsx     # PDF viewer
│   │   ├── ImageViewer.tsx   # Image viewer
│   │   ├── TextViewer.tsx    # Text file viewer
│   │   └── UnsupportedViewer.tsx
│   ├── ui/
│   │   ├── BottomSheet.tsx   # Mobile bottom sheet
│   │   ├── Modal.tsx         # Desktop modal
│   │   ├── Toast.tsx         # Toast notifications
│   │   ├── FileIcon.tsx      # File type icons
│   │   ├── EmptyState.tsx    # Empty state component
│   │   ├── Skeleton.tsx      # Loading skeletons
│   │   └── LoadingScreen.tsx # Full-page loader
│   └── workspace/
│       ├── WorkspaceLayout.tsx
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── DocumentList.tsx
│       ├── DocumentCard.tsx
│       ├── DocumentGridCard.tsx
│       ├── UploadButton.tsx
│       └── UploadProgressBar.tsx
├── context/
│   ├── AuthContext.tsx       # Authentication state
│   ├── DocumentsContext.tsx  # Documents state
│   └── ToastContext.tsx      # Toast notifications
├── lib/
│   ├── firebase.ts           # Firebase config
│   ├── firestore.ts          # Firestore operations
│   ├── ipfs.ts               # IPFS/Web3.Storage helpers
│   └── utils.ts              # Utility functions
├── types/
│   └── index.ts              # TypeScript types
├── styles/
│   └── globals.css           # Global styles
├── public/
│   ├── manifest.json         # PWA manifest
│   └── favicon.svg           # App icon
├── firestore.rules           # Firestore security rules
└── firebase.json             # Firebase config
```

## 🔒 Security

### Firestore Rules

The app uses strict security rules:

- ✅ Users must be authenticated
- ✅ Users can only read their own documents
- ✅ Users can only create documents with their own UID
- ✅ Users cannot modify ownership after creation
- ✅ All other access is denied

### Data Privacy

- Files are stored on IPFS (decentralized)
- Only file metadata is stored in Firestore
- No sensitive data is exposed client-side
- Firebase handles all authentication securely

## 📱 Mobile Features

- **Swipe gestures** - Swipe down to close previews
- **Bottom sheets** - Native-feeling modal dialogs
- **Touch targets** - Minimum 44px tap targets
- **Safe areas** - Proper notch/home indicator support
- **Camera upload** - Direct camera capture support
- **PWA ready** - Installable as mobile app

## 🎨 Customization

### Theme Colors

Edit `tailwind.config.ts` to customize the color palette:

```ts
theme: {
  extend: {
    colors: {
      primary: {
        500: '#3b82f6', // Main brand color
        // ... other shades
      }
    }
  }
}
```

### Design System

Custom utility classes in `globals.css`:

- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.btn-ghost` - Ghost/text button
- `.card` - Card component
- `.input` - Form inputs

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to add all `NEXT_PUBLIC_*` variables in your deployment platform.

## 📄 License

MIT License - feel free to use this for your own projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using Next.js, Firebase, and Web3.Storage
