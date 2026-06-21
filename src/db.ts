import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  deleteDoc,
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { AssistenciaTecnica, Tecnico, OrdemServico, AppUser, StoreSettings } from './types';

// Generic sync function
export const syncCollection = <T extends { id: string }>(
  collectionName: string, 
  callback: (data: T[]) => void
) => {
  return onSnapshot(query(collection(db, collectionName)), (snapshot) => {
    const data = snapshot.docs.map(doc => doc.data() as T);
    callback(data);
  });
};

// Generic save function
export const saveToFirestore = async <T extends { id: string }>(
  collectionName: string, 
  data: T
) => {
  await setDoc(doc(db, collectionName, data.id), data);
};

// Generic delete function
export const deleteFromFirestore = async (
  collectionName: string, 
  id: string
) => {
  await deleteDoc(doc(db, collectionName, id));
};

// Settings are special (singular doc)
export const syncSettings = (callback: (settings: StoreSettings) => void) => {
  return onSnapshot(doc(db, 'settings', 'current'), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as StoreSettings);
    }
  });
};

export const saveSettingsToFirestore = async (settings: StoreSettings) => {
  await setDoc(doc(db, 'settings', 'current'), settings);
};
