'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, Users, Clock, Building, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useUser, useCollection, useMemoFirebase, WithId, signOutUser, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { divisionData } from '@/lib/divisions';
import type { VisitorEntry } from '@/lib/types';

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { firestore } = useFirebase();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (!isUserLoading && user && user.email !== 'policevms@admin.com') {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const visitorEntriesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'visitorEntries') : null),
    [firestore, user]
  );
  const { data: allVisitors, isLoading: visitorsLoading } = useCollection<VisitorEntry>(visitorEntriesQuery);

  const divisionStats = useMemo(() => {
    if (!allVisitors) return [];
    return divisionData.map(division => {
      const visitorsInDivision = allVisitors.filter(v => v.divisionId === division.id);
      const activeCount = visitorsInDivision.filter(v => v.status === 'IN').length;
      return { ...division, activeCount };
    });
  }, [allVisitors]);

  const historyWithDuration = useMemo(() => {
    if (!allVisitors) return [];
    return allVisitors
      .filter(v => v.status === 'OUT' && v.checkOutTime)
      .map(v => {
        const durationMs = v.checkOutTime!.toMillis() - v.checkInTime.toMillis();
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        return { ...v, duration: `${minutes}m ${seconds}s` };
      })
      .sort((a, b) => b.checkOutTime!.toMillis() - a.checkOutTime!.toMillis());
  }, [allVisitors]);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-yellow-400" />
              <h1 className="text-lg font-bold">Admin Dashboard</h1>
            </div>
            <div>
              <Button variant="ghost" onClick={() => router.push('/')} className="text-white hover:bg-blue-700">Visitor Management</Button>
              <Button variant="ghost" onClick={handleSignOut} className="text-white hover:bg-blue-700">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visitors Today</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allVisitors?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">Total records</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allVisitors?.filter(v => v.status === 'IN').length ?? 0}</div>
                <p className="text-xs text-muted-foreground">Currently inside</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Active Visitors by Division</CardTitle>
              <CardDescription>Real-time count of visitors inside each division.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {divisionStats.map(div => (
                  <div key={div.id} className="p-4 rounded-lg border flex items-center justify-between" style={{ backgroundColor: div.color, color: div.text }}>
                    <div>
                      <p className="font-bold text-lg">{div.en}</p>
                      <p className="text-xs opacity-80">{div.si}</p>
                    </div>
                    <div className="text-3xl font-extrabold">{div.activeCount}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visitor History</CardTitle>
              <CardDescription>Complete log of all visitor entries and exits.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitorsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center">Loading data...</TableCell></TableRow>
                  ) : historyWithDuration.length > 0 ? (
                    historyWithDuration.map(visitor => (
                      <TableRow key={visitor.id}>
                        <TableCell>
                          <div className="font-medium">{visitor.fullName}</div>
                          <div className="text-sm text-muted-foreground">{visitor.identificationNumber} ({visitor.identificationType})</div>
                        </TableCell>
                        <TableCell>
                           <Badge style={{ backgroundColor: visitor.divisionBackgroundColorHex, color: visitor.divisionTextColorHex }}>{visitor.divisionEnglishName}</Badge>
                        </TableCell>
                        <TableCell>{visitor.checkInTime.toDate().toLocaleString()}</TableCell>
                        <TableCell>{visitor.checkOutTime?.toDate().toLocaleString()}</TableCell>
                        <TableCell>{visitor.duration}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center">No history records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
