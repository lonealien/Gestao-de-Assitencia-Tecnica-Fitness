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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generic sync function
export const syncCollection = <T extends { id: string }>(
  collectionName: string, 
  callback: (data: T[]) => void
) => {
  return onSnapshot(
    query(collection(db, collectionName)), 
    (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as T);
      callback(data);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
    }
  );
};

// Generic save function
export const saveToFirestore = async <T extends { id: string }>(
  collectionName: string, 
  data: T
) => {
  try {
    await setDoc(doc(db, collectionName, data.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${data.id}`);
  }
};

// Generic delete function
export const deleteFromFirestore = async (
  collectionName: string, 
  id: string
) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
};

// Settings are special (singular doc)
export const syncSettings = (callback: (settings: StoreSettings) => void) => {
  return onSnapshot(
    doc(db, 'settings', 'current'), 
    (doc) => {
      if (doc.exists()) {
        callback(doc.data() as StoreSettings);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/current');
    }
  );
};

export const saveSettingsToFirestore = async (settings: StoreSettings) => {
  try {
    await setDoc(doc(db, 'settings', 'current'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/current');
  }
};
