import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: '',
  authDomain: 'firegroup-culture.firebaseapp.com',
  projectId: 'firegroup-culture',
  storageBucket: 'firegroup-culture.appspot.com',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
}
export const firebaseApp = initializeApp(firebaseConfig)
export const fireAuth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
