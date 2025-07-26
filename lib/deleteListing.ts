// lib/deleteListing.ts
import { doc, deleteDoc } from 'firebase/firestore';
import { firebase_db } from '@/firebase';

export const deleteListing = async (listingId: string) => {
  await deleteDoc(doc(firebase_db, 'listings', listingId));
};
