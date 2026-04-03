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
import { User, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
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
  const [isRedirecting, setIsRedirecting] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedUsers = async () => {
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
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, userData.password);
            const newUser = userCredential.user;

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
                    variant: "destructive",
                    title: "User Already Exists in Auth",
                    description: `${userData.email} already exists in Firebase Auth. Cannot seed Firestore document. Please clear users from Auth and try again.`,
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


  const handleRedirect = async (currentUser: User | null) => {
    if (!currentUser || !firestore) {
      setIsRedirecting(false); 
      return;
    }

    try {
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'Admin') {
          router.replace('/admin');
        } else if (userData.role === 'Visitor Management') {
          router.replace('/visitormanagement');
        } else {
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'Your account does not have a valid role.',
          });
          setIsRedirecting(false);
        }
      } else {
        const email = currentUser.email?.toLowerCase();
        const testUsers: Record<string, { role: string; permissions: string[]; name: string; }> = {
            'policevms@admin.com': { 
                role: 'Admin', 
                permissions: ["Admin Dashboard", "Active Visitors by Division", "Visitor History", "Audit Trail", "Access Management"],
                name: "Police VMS Admin"
            },
            'policevms@visitormanagement.com': { 
                role: 'Visitor Management', 
                permissions: ["Check-In", "Active", "History"],
                name: "Police VMS Staff"
            },
            'vms.thilanka@admin.com': {
                role: 'Admin',
                permissions: ["Admin Dashboard", "Active Visitors by Division", "Visitor History"],
                name: "Thilanka"
            }
        };

        if (email && testUsers[email]) {
            const { role, permissions, name } = testUsers[email];
            await setDoc(doc(firestore, "users", currentUser.uid), {
                name,
                email: currentUser.email,
                role,
                permissions,
            });
            handleRedirect(currentUser);
        } else {
             toast({
              variant: 'destructive',
              title: 'Configuration Error',
              description: 'User role not found. Please contact an administrator.',
            });
            setIsRedirecting(false);
        }
      }
    } catch (error) {
      console.error("Redirection logic failed:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while verifying your user role.',
      });
      setIsRedirecting(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        handleRedirect(user);
      } else {
        setIsRedirecting(false);
      }
    }
  }, [user, isUserLoading]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    const email = values.email.toLowerCase();
    try {
      await signInWithEmail(email, values.password);
    } catch (error: any) {
      const isTestAccount = [
        'policevms@admin.com', 
        'policevms@visitormanagement.com', 
        'vms.thilanka@admin.com'
      ].includes(email);
      
      if (isTestAccount && (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found')) {
        try {
          const auth = getAuth();
          await createUserWithEmailAndPassword(auth, email, values.password);
          toast({
            title: "Test Account Created",
            description: "Successfully set up and logged in.",
          });
        } catch (creationError: any) {
          console.error("Test account creation failed:", creationError);
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: "The password may be incorrect, or an error occurred during setup.",
          });
        }
      } else {
        console.error("Login failed:", error);
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid credentials. Please check your email and password.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }
  
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
