import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCa_PdxFwIMOGOOvY1wngWn5m7wydXNA5A",
  authDomain: "woven-bivouac-kk7s0.firebaseapp.com",
  projectId: "woven-bivouac-kk7s0",
  storageBucket: "woven-bivouac-kk7s0.firebasestorage.app",
  messagingSenderId: "964126565029",
  appId: "1:964126565029:web:c72a40a947e1a7d729e34c",
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
