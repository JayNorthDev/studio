import { VisitorForm } from '@/components/visitor-form';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4 sm:p-6 md:p-8">
      <VisitorForm />
    </main>
  );
}
