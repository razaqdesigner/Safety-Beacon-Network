import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, User, Phone, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function Users() {
  const [, setLocation] = useLocation();
  const { data: users, isLoading } = useListUsers();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users?.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(searchLower) ||
      user.phoneNumber.includes(searchTerm) ||
      user.nationalId.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Citizens Directory</h1>
        <p className="text-muted-foreground">Manage registered users and view their alert history.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, email, or National ID..."
          className="pl-8 bg-card"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead>Citizen Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <UsersIcon className="h-8 w-8 mb-2 opacity-50" />
                      <p>No citizens found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow 
                    key={user.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/users/${user.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                          {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{user.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm mb-1">
                        <Phone className="mr-1.5 h-3 w-3 text-muted-foreground" />
                        {user.phoneNumber}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Mail className="mr-1.5 h-3 w-3" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{user.nationalId}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="mr-1.5 h-3 w-3" />
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function UsersIcon(props: React.ComponentProps<"svg">) {
  return <User {...props} />;
}
