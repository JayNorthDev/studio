'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser, signInWithEmail, useFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // This state is true while we are checking for a user and their role to decide on a redirect.
  const [isVerifying, setIsVerifying] = useState(true);

  // This effect handles redirection for already logged-in users.
  useEffect(() => {
    // Wait until Firebase Auth has finished loading.
    if (isUserLoading) {
      return;
    }

    // If there is a logged-in user, we need to check their role and redirect them.
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef)
        .then((userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'Admin') {
              router.replace('/admin');
            } else if (userData.role === 'Visitor Management') {
              router.replace('/visitormanagement');
            } else {
              // User has an invalid role, so we keep them on the login page.
              setIsVerifying(false);
              toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'Your account does not have a valid role.',
              });
            }
          } else {
            // This case is for when a user exists in Auth but not in Firestore.
            // This can happen if the seed script hasn't been run for that user.
            setIsVerifying(false);
             toast({
              variant: 'destructive',
              title: 'Profile Incomplete',
              description: 'Your user profile is not configured. Please click "Seed Initial Users" or contact an admin.',
            });
          }
        })
        .catch((error) => {
          console.error("Error verifying user role:", error);
          setIsVerifying(false); // Stop verifying on error
        });
    } else {
      // No user is logged in, so we can show the login form.
      setIsVerifying(false);
    }
  }, [user, isUserLoading, firestore, router, toast]);

  const handleSeedUsers = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    toast({ title: "Starting user seeding..." });

    const seedUsersData = [
        {
            email: 'policevms@admin.com',
            password: 'password123',
            name: 'Admin',
            role: 'Admin',
            permissions: ["Admin Dashboard", "Active Visitors by Division", "Visitor History", "Audit Trail", "Access Management"]
        },
        {
            email: 'policevms@visitormanagement.com',
            password: 'password123',
            name: 'Visitor Management',
            role: 'Visitor Management',
            permissions: ["Check-In", "Active", "History"]
        },
        {
            email: 'vms.thilanka@admin.com',
            password: 'password123',
            name: 'Thilanka',
            role: 'Admin',
            permissions: ["Admin Dashboard", "Active Visitors by Division", "Visitor History"]
        }
    ];

    const secondaryAppName = `seed-auth-app-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    for (const userData of seedUsersData) {
        try {
            // Create Auth user
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, userData.password);
            const newUser = userCredential.user;

            // Create Firestore doc with the new user's UID
            await setDoc(doc(firestore, "users", newUser.uid), {
                name: userData.name,
                email: userData.email,
                role: userData.role,
                permissions: userData.permissions,
            });

            toast({
                title: "User Seeded Successfully",
                description: `Created user for ${userData.email}`,
            });

        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                 toast({
                    title: "User Already Exists",
                    description: `${userData.email} already exists in Auth. Skipping.`,
                });
            } else {
                console.error(`Error seeding ${userData.email}:`, error);
                toast({
                    variant: "destructive",
                    title: `Error Seeding ${userData.email}`,
                    description: error.message,
                });
            }
        }
    }
    setIsSeeding(false);
    toast({ title: "User seeding complete." });
  };

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      await signInWithEmail(values.email, values.password);
      // The useEffect hook will handle the redirect on successful login after state updates.
    } catch (error: any) {
        console.error("Login failed:", error);
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid credentials. Please check your email and password.",
        });
    } finally {
      setIsSubmitting(false);
    }
  }

  // While checking for a user session or verifying their role, show a loading screen.
  if (isUserLoading || isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }
  
  // If not loading and a user is not being verified, show the login form.
  return (
      <div className="relative flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="absolute top-4 right-4">
          <Button onClick={handleSeedUsers} disabled={isSeeding} variant="outline">
            {isSeeding ? 'Seeding...' : 'Seed Initial Users'}
          </Button>
        </div>
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Visitor Management System
            </CardTitle>
            <CardDescription>
              Please sign in to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="user@example.com"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Signing In...'
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" /> Sign In
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
}
