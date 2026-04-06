
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import Image from 'next/image';
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
import { useAuth } from '@/hooks/useAuth';
import { signInWithEmail, useFirebase } from '@/firebase';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, userData, loading } = useAuth();
  const { firestore } = useFirebase(); // Still needed for seeding
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    // Only perform redirects once loading is complete
    if (!loading) {
      if (user && userData) {
        // User is logged in and has data, proceed to the correct dashboard
        if (userData.role === 'Admin') {
          router.replace('/admin');
        } else if (userData.role === 'Visitor Management') {
          router.replace('/visitormanagement');
        }
      } else if (user && !userData) {
        // User is authenticated but has no Firestore document, show an error.
        toast({
          variant: 'destructive',
          title: 'Profile Incomplete',
          description: 'Your user profile is not configured. Please contact an admin.',
        });
      }
      // If no user, do nothing and show the login page.
    }
  }, [user, userData, loading, router, toast]);

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
      // The useEffect hook will now handle the redirect reliably.
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

  // Show a loading screen while the auth state is being determined or a redirect is imminent.
  if (loading || (user && userData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }
  
  // If not loading and no user, show the login form.
  return (
      <div className="relative flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="absolute top-4 right-4">
          <Button onClick={handleSeedUsers} disabled={isSeeding} variant="outline">
            {isSeeding ? 'Seeding...' : 'Seed Initial Users'}
          </Button>
        </div>
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Image
                src="/logo.png"
                alt="Police VMS Logo"
                width={64}
                height={64}
                className="rounded-full"
              />
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
