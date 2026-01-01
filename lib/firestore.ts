import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DocumentFile } from '@/types';

const COLLECTION_NAME = 'documents';

// Convert Firestore timestamp to Date
function convertTimestamp(timestamp: Timestamp | Date): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
}

// Create a new document entry
export async function createDocument(
  ownerId: string,
  data: Omit<DocumentFile, 'fileId' | 'ownerId' | 'createdAt'>
): Promise<DocumentFile> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    ownerId,
    createdAt: serverTimestamp(),
  });

  return {
    fileId: docRef.id,
    ownerId,
    ...data,
    createdAt: new Date(),
  };
}

// Get all documents for a user
export async function getUserDocuments(ownerId: string): Promise<DocumentFile[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      fileId: doc.id,
      ownerId: data.ownerId,
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      ipfsCID: data.ipfsCID,
      ipfsURL: data.ipfsURL,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: data.updatedAt ? convertTimestamp(data.updatedAt) : undefined,
    } as DocumentFile;
  });
}

// Get a single document by ID
export async function getDocument(
  fileId: string,
  ownerId: string
): Promise<DocumentFile | null> {
  const docRef = doc(db, COLLECTION_NAME, fileId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  
  // Verify ownership
  if (data.ownerId !== ownerId) {
    throw new Error('Access denied');
  }

  return {
    fileId: docSnap.id,
    ownerId: data.ownerId,
    fileName: data.fileName,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    ipfsCID: data.ipfsCID,
    ipfsURL: data.ipfsURL,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: data.updatedAt ? convertTimestamp(data.updatedAt) : undefined,
  } as DocumentFile;
}

// Update document metadata
export async function updateDocument(
  fileId: string,
  ownerId: string,
  updates: Partial<Pick<DocumentFile, 'fileName'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, fileId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Document not found');
  }

  const data = docSnap.data();
  
  // Verify ownership
  if (data.ownerId !== ownerId) {
    throw new Error('Access denied');
  }

  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Delete a document
export async function deleteDocument(
  fileId: string,
  ownerId: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, fileId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Document not found');
  }

  const data = docSnap.data();
  
  // Verify ownership
  if (data.ownerId !== ownerId) {
    throw new Error('Access denied');
  }

  await deleteDoc(docRef);
}
