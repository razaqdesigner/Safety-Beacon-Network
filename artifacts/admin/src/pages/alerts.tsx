import { useState } from "react";
import { useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Search, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link, useLocation } from "wouter";

export default function Alerts() {
  const [, setLocation] = useLocation();
  const { data: alerts, isLoading } = useListAlerts();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filteredAlerts = alerts?.filter(alert => {
    const matchesSearch = alert.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          alert.user.phoneNumber.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    const matchesSource = sourceFilter === "all" || alert.triggerSource === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  }).sort((a, b) => {
    // Sort active first, then by date descending
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) || [];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts Log</h1>
        <p className="text-muted-foreground">Comprehensive history of all community alerts.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by citizen name or phone..."
            className="pl-8 bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Trigger Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="button">Button Press</SelectItem>
            <SelectItem value="shake">Device Shake</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Citizen</TableHead>
                <TableHead>Time Triggered</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="h-8 w-8 mb-2 opacity-50" />
                      <p>No alerts found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <TableRow 
                    key={alert.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/alerts/${alert.id}`)}
                  >
                    <TableCell>
                      {alert.status === "active" ? (
                        <Badge variant="destructive" className="gap-1.5 animate-pulse">
                          <AlertTriangle className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" /> Resolved
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{alert.user.fullName}</div>
                      <div className="text-xs text-muted-foreground">{alert.user.phoneNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(alert.createdAt), "MMM d, yyyy h:mm a")}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {alert.triggerSource}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
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
