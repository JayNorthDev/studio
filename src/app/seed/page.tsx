'use client';

import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function SeedPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const handleSeedUsers = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available. Please try again later.',
      });
      return;
    }

    try {
      const usersToSeed = [
        {
          // NOTE: The Document ID for a user should match their Firebase Auth UID.
          // This seeding page uses email as a placeholder ID. You will need to update these
          // document IDs to match the actual UIDs after the users are created in Firebase Auth.
          id: 'policevms@admin.com',
          data: {
            email: 'policevms@admin.com',
            name: 'Admin',
            role: 'Admin',
            permissions: [
              'Admin Dashboard',
              'Active Visitors by Division',
              'Visitor History',
              'Audit Trail',
              'Access Management',
            ],
          },
        },
        {
          id: 'policevms@visitormanagement.com',
          data: {
            email: 'policevms@visitormanagement.com',
            name: 'Visitor Management',
            role: 'Visitor Management',
            permissions: ['Check-In', 'Active', 'History'],
          },
        },
        {
          id: 'vms.thilanka@admin.com',
          data: {
            email: 'vms.thilanka@admin.com',
            name: 'Thilanka',
            role: 'Admin',
            permissions: [
              'Admin Dashboard',
              'Active Visitors by Division',
              'Visitor History',
            ],
          },
        },
      ];

      for (const user of usersToSeed) {
        // This will create a document with the email as the ID.
        // For a real application, you should use the Firebase Auth UID.
        const userDocRef = doc(firestore, 'users', user.id);
        await setDoc(userDocRef, user.data);
      }

      toast({
        title: 'Success!',
        description: '3 user documents were created/updated in Firestore.',
      });
      alert('Users Seeded Successfully!');
      
    } catch (error) {
      console.error('Error seeding users:', error);
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: 'An error occurred. Check the console for details.',
      });
      alert('An error occurred while seeding users. Check the console for details.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold">Firestore User Seeder</h1>
        <p className="mb-6 text-center text-gray-600">
          Click the button to create the initial user role documents in the 'users' collection.
        </p>
        <p className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-center text-xs text-yellow-800">
          <strong>Important:</strong> This page sets the Document ID to be the user's email for simplicity. In a real app, you must update the Document ID to match the user's actual UID from Firebase Authentication after they sign up.
        </p>
        <Button onClick={handleSeedUsers} className="w-full">
          Seed Initial Users
        </Button>
      </div>
    </div>
  );
}
