'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { LogOut, Users, LayoutDashboard, Wallet, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

type UserProfile = {
    id: string;
    displayName: string;
    numericId: string;
    balance: number;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
};

function UsersGrid() {
    const { data: users, loading, error } = useCollection<UserProfile>(
        'users'
    );

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex-row items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <Card className="bg-destructive/10">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Fetching Users</CardTitle>
                    <CardDescription className="text-destructive/80">
                        Could not retrieve user data. Your current Firestore security rules may be blocking this query. For this feature to work, an admin must have read access to the 'users' collection.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user) => (
            <Card key={user.id} className="flex flex-col">
                <CardHeader className="flex-row items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-base">{user.displayName}</CardTitle>
                        <CardDescription>UID: {user.numericId}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-1">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-xl font-bold">{(user.balance || 0).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">LGB</span></p>
                    <p className="text-xs text-muted-foreground pt-2">{user.phoneNumber || 'No phone number'}</p>
                </CardContent>
                <CardFooter>
                     <Button asChild className="w-full" variant="outline">
                        <Link href={`/admin/users/${user.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View User
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
    );
}


export default function AdminDashboardPage() {
    const router = useRouter();
    const { data: users, loading } = useCollection('users');

    const handleLogout = () => {
        document.cookie = 'admin-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push('/admin/login');
    };
    
    const totalUsers = users?.length || 0;
    const totalBalance = users?.reduce((acc, user) => acc + (user.balance || 0), 0) || 0;

  return (
    <div className="flex min-h-screen w-full flex-col">
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10 justify-between">
            <Logo className="text-2xl" />
            <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3">
            <TabsTrigger value="dashboard">
                <LayoutDashboard className="mr-2" />
                Dashboard
            </TabsTrigger>
            <TabsTrigger value="users">
                <Users className="mr-2"/>
                Users
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalUsers}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                        Total Balance
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                       {loading ? <Skeleton className="h-8 w-2/3" /> : <div className="text-2xl font-bold">{totalBalance.toFixed(2)} <span className="text-sm text-muted-foreground">LGB</span></div>}
                    </CardContent>
                </Card>
            </div>
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersGrid />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
