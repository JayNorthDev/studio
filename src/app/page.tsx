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
          router.push('/admin');
        } else if (userData.role === 'Visitor Management') {
          router.push('/visitormanagement');
        } else {
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'Your account does not have a valid role.',
          });
          setIsRedirecting(false);
        }
      } else {
        const testUserEmails = ['policevms@admin.com', 'policevms@visitormanagement.com'];
        const isTestUser = testUserEmails.includes(currentUser.email || '');

        if (isTestUser) {
           const role = currentUser.email === 'policevms@admin.com' ? 'Admin' : 'Visitor Management';
           const permissions = role === 'Admin' 
              ? ["Admin Dashboard", "Active Visitors by Division", "Visitor History", "Audit Trail", "Access Management"]
              : ["Check-In", "Active", "History"];

            await setDoc(doc(firestore, "users", currentUser.uid), {
                name: role, // Use role as name for seed
                email: currentUser.email,
                role: role,
                permissions: permissions,
            });
            handleRedirect(currentUser); // Retry redirection
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
      console.error("Redirection failed:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not verify user role.',
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
    try {
      await signInWithEmail(values.email, values.password);
      // signInWithEmail triggers onAuthStateChanged, which runs the useEffect and handles redirection
    } catch (error: any) {
      const isTestAccount = values.email === 'policevms@admin.com' || values.email === 'policevms@visitormanagement.com';
      
      if (isTestAccount && (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found')) {
        try {
          const auth = getAuth();
          await createUserWithEmailAndPassword(auth, values.email, values.password);
          // After creation, onAuthStateChanged in useEffect will trigger and handle the redirect.
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
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
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
