
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

interface UseAuthResult {
  user: User | null;
  userData: UserProfile | null;
  loading: boolean;
}

export function useAuth(): UseAuthResult {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      // Firebase services might not be available on initial render.
      // The effect will re-run once they are.
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Set loading to true at the start of an auth state change
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData({ id: userDoc.id, ...userDoc.data() } as UserProfile);
          } else {
            // User is in Auth, but no corresponding document in Firestore.
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
          setUserData(null);
        }
      } else {
        // No user is logged in.
        setUser(null);
        setUserData(null);
      }
      // Critical: Set loading to false only after all async operations for an auth state are complete.
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth, firestore]);

  return { user, userData, loading };
}
