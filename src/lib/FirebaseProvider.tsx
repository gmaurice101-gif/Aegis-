import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  setDoc, 
  doc,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Person, RecognitionEvent } from '../types';

interface FirebaseContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  people: Person[];
  events: RecognitionEvent[];
  registerPerson: (person: Omit<Person, 'id' | 'createdAt'>) => Promise<void>;
  logEvent: (event: Omit<RecognitionEvent, 'id' | 'timestamp'>) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<RecognitionEvent[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setPeople([]);
      setEvents([]);
      return;
    }

    const qPeople = query(collection(db, 'people'), orderBy('name'));
    const unsubscribePeople = onSnapshot(qPeople, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
      setPeople(pData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'people'));

    const qEvents = query(collection(db, 'events'), orderBy('timestamp', 'desc'));
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const eData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toLocaleTimeString() : data.timestamp
        } as RecognitionEvent;
      });
      setEvents(eData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'events'));

    return () => {
      unsubscribePeople();
      unsubscribeEvents();
    };
  }, [user]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const registerPerson = async (p: Omit<Person, 'id' | 'createdAt'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const path = `people/${id}`;
    try {
      await setDoc(doc(db, 'people', id), {
        ...p,
        id,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const logEvent = async (e: Omit<RecognitionEvent, 'id' | 'timestamp'>) => {
    const path = 'events';
    try {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'events', id), {
        ...e,
        id,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, signIn, logOut, people, events, registerPerson, logEvent }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within FirebaseProvider');
  return context;
};
