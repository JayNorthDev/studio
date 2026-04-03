'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  LogOut,
  Users,
  UserCheck,
  LayoutDashboard,
  Building,
  Clock,
  UserCog,
  ScrollText,
  BadgeCheck,
  BadgeAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useUser, useCollection, useMemoFirebase, signOutUser, useFirebase } from '@/firebase';
import { collection, doc, getDoc, Timestamp } from 'firebase/firestore';
import { divisionData } from '@/lib/divisions';
import type { VisitorEntry } from '@/lib/types';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { startOfToday } from 'date-fns';

type AdminView = 'dashboard' | 'active_visitors' | 'history' | 'access_management' | 'audit_trail';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { firestore } = useFirebase();
  const [activeView, setActiveView] = useState<AdminView>('dashboard');

  // ROUTE PROTECTION LOGIC
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/'); // Redirect to login if not authenticated
    } else if (user && firestore) {
      const checkRole = async () => {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== 'Admin') {
            router.push('/visitormanagement'); // Redirect non-admins
          }
        } else {
          router.push('/'); // No role found, redirect to login
        }
      };
      checkRole();
    }
  }, [user, isUserLoading, router, firestore]);

  const visitorEntriesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'visitorEntries') : null),
    [firestore, user]
  );
  const { data: allVisitors, isLoading: visitorsLoading } = useCollection<VisitorEntry>(visitorEntriesQuery);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView allVisitors={allVisitors || []} isLoading={visitorsLoading} />;
      case 'active_visitors':
        return <ActiveVisitorsByDivisionView allVisitors={allVisitors || []} />;
      case 'history':
        return <HistoryView allVisitors={allVisitors || []} isLoading={visitorsLoading} />;
      case 'access_management':
        return <AccessManagementView />;
      case 'audit_trail':
        return <AuditTrailView />;
      default:
        return <DashboardView allVisitors={allVisitors || []} isLoading={visitorsLoading} />;
    }
  }

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar className="flex flex-col">
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <ShieldCheck className="w-8 h-8 text-yellow-400" />
              <h1 className="text-lg font-bold">Admin Panel</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')}><LayoutDashboard /> Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeView === 'active_visitors'} onClick={() => setActiveView('active_visitors')}><Building /> Active By Division</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeView === 'history'} onClick={() => setActiveView('history')}><Clock /> Visitor History</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeView === 'access_management'} onClick={() => setActiveView('access_management')}><UserCog /> Access Management</SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeView === 'audit_trail'} onClick={() => setActiveView('audit_trail')}><ScrollText /> Audit Trail</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
             <Button variant="ghost" onClick={() => router.push('/visitormanagement')} className="text-white hover:bg-blue-700 justify-start">Visitor Management</Button>
            <Button variant="ghost" onClick={handleSignOut} className="text-white hover:bg-blue-700 justify-start">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 p-4 sm:p-6 lg:p-8">
           <header className="flex items-center justify-between md:hidden mb-4 p-2 bg-white rounded-md shadow">
            <div className="flex items-center gap-2">
                 <ShieldCheck className="w-6 h-6 text-yellow-500" />
                 <span className="font-bold">Admin Panel</span>
            </div>
             <SidebarTrigger />
           </header>
          {renderContent()}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


// --- Admin Sub-Views ---

const DashboardView = ({ allVisitors, isLoading }: { allVisitors: VisitorEntry[], isLoading: boolean }) => {
    
    const stats = useMemo(() => {
        if (isLoading || !allVisitors) {
            return { completed: 0, pending: 0, active: 0, today: 0 };
        }
        
        const todayStart = startOfToday();
        
        return {
            completed: allVisitors.filter(v => v.taskStatus === 'Completed').length,
            pending: allVisitors.filter(v => v.taskStatus === 'Incomplete').length,
            active: allVisitors.filter(v => v.status === 'IN').length,
            today: allVisitors.filter(v => v.checkInTime.toDate() >= todayStart).length,
        }
    }, [allVisitors, isLoading]);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Visitors Today</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : stats.today}</div>
                        <p className="text-xs text-muted-foreground">Total records for today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : stats.active}</div>
                        <p className="text-xs text-muted-foreground">Currently inside</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                        <BadgeCheck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : stats.completed}</div>
                        <p className="text-xs text-muted-foreground">Total completed tasks</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasks Pending</CardTitle>
                        <BadgeAlert className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : stats.pending}</div>
                        <p className="text-xs text-muted-foreground">Total incomplete tasks</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                 <CardHeader>
                    <CardTitle>Visitor Trends</CardTitle>
                    <CardDescription>Visual representation of visitor data.</CardDescription>
                </CardHeader>
                <CardContent className='h-96 flex items-center justify-center'>
                    <p className='text-muted-foreground'>Chart implementation coming soon.</p>
                </CardContent>
            </Card>
        </div>
    )
}

const ActiveVisitorsByDivisionView = ({ allVisitors }: { allVisitors: VisitorEntry[] }) => {
   const divisionStats = useMemo(() => {
    if (!allVisitors) return [];
    return divisionData.map(division => {
      const visitorsInDivision = allVisitors.filter(v => v.divisionId === division.id);
      const activeCount = visitorsInDivision.filter(v => v.status === 'IN').length;
      return { ...division, activeCount };
    });
  }, [allVisitors]);

  return (
    <Card>
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
  )
}

const HistoryView = ({ allVisitors, isLoading }: { allVisitors: VisitorEntry[], isLoading: boolean }) => {
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

    return (
        <Card>
            <CardHeader>
              <CardTitle>Visitor History</CardTitle>
              <CardDescription>Complete log of all visitor entries and exits. Filters and PDF export coming soon.</CardDescription>
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
                    <TableHead>Task Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Loading data...</TableCell></TableRow>
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
                        <TableCell>
                          {visitor.taskStatus ? (
                            <Badge
                              className={
                                visitor.taskStatus === 'Completed'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-orange-600 text-white'
                              }
                            >
                              {visitor.taskStatus}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">N/A</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center">No history records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
    )
}

const AccessManagementView = () => (
    <Card>
         <CardHeader>
            <CardTitle>Access Management</CardTitle>
            <CardDescription>Manage user roles and permissions.</CardDescription>
        </CardHeader>
        <CardContent className='h-96 flex items-center justify-center'>
            <p className='text-muted-foreground'>User registration and permission management coming soon.</p>
        </CardContent>
    </Card>
)

const AuditTrailView = () => (
    <Card>
         <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>Track user actions within the system.</CardDescription>
        </CardHeader>
        <CardContent className='h-96 flex items-center justify-center'>
            <p className='text-muted-foreground'>Audit log display coming soon.</p>
        </CardContent>
    </Card>
)
