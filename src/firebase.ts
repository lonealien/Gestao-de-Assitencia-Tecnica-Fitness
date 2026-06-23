import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBlugpvwwPyXJmFeEr6ZwttNzvoEKvJngk",
  authDomain: "gestao-at-fitness.firebaseapp.com",
  projectId: "gestao-at-fitness",
  storageBucket: "gestao-at-fitness.firebasestorage.app",
  messagingSenderId: "646376601872",
  appId: "1:646376601872:web:ea998537f21ff47de6cd95",
  databaseId: "ai-studio-7ad3c002-2b58-4d4f-b9ea-8955bae2e53a"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.databaseId);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else {
      console.warn("Connection test status:", error);
    }
  }
}
testConnection();
