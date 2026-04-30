import { useParams } from "wouter";
import { useGetUser, useListUserAlerts, getGetUserQueryKey, getListUserAlertsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Mail, Calendar, ShieldAlert, AlertTriangle, CheckCircle2, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";

export default function UserDetail() {
  const params = useParams();
  
  // Need to provide enabled option with queryKey
  const userId = params.id || "";
  const { data: user, isLoading: isLoadingUser } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId) }
  });
  
  const { data: alerts, isLoading: isLoadingAlerts } = useListUserAlerts(userId, {
    query: { enabled: !!userId, queryKey: getListUserAlertsQueryKey(userId) }
  });

  const sortedAlerts = alerts ? [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  if (isLoadingUser) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Citizen Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">The user profile you are looking for does not exist.</p>
        <Button asChild>
          <Link href="/users">Back to Directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Citizen Profile</h1>
          <p className="text-muted-foreground">ID: <span className="font-mono">{user.id}</span></p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/users">Back to Directory</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="bg-primary/5 h-24 w-full" />
            <CardContent className="px-6 pt-0 pb-6 relative">
              <div className="absolute -top-12 left-6 h-24 w-24 rounded-full border-4 border-card bg-card flex items-center justify-center shadow-sm">
                <div className="h-full w-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-medium">
                  {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
              </div>
              
              <div className="mt-14 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{user.fullName}</h2>
                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                    <Calendar className="mr-1 h-3 w-3" /> Registered {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">Phone Number</p>
                      <a href={`tel:${user.phoneNumber}`} className="font-medium hover:underline">{user.phoneNumber}</a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">Email Address</p>
                      <a href={`mailto:${user.email}`} className="font-medium hover:underline">{user.email}</a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">National ID</p>
                      <p className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs mt-0.5 inline-block">{user.nationalId}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Verification</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Timeline */}
        <div className="md:col-span-2 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-xl">
                  <ActivityIcon className="mr-2 h-5 w-5 text-primary" /> Alert History
                </CardTitle>
                {!isLoadingAlerts && (
                  <Badge variant="secondary">
                    {sortedAlerts.length} Total Alerts
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {isLoadingAlerts ? (
                <div className="p-6 space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-full w-0.5 flex-1 my-2" />
                      </div>
                      <div className="flex-1 space-y-2 pb-6">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ShieldAlert className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="font-medium">No alerts generated</p>
                  <p className="text-sm">This citizen has never triggered an emergency alert.</p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="relative space-y-0 pl-4 before:absolute before:inset-0 before:ml-[23px] before:w-0.5 before:bg-border before:content-['']">
                    {sortedAlerts.map((alert, index) => {
                      const isLast = index === sortedAlerts.length - 1;
                      const isActive = alert.status === "active";
                      
                      return (
                        <div key={alert.id} className={`relative flex gap-6 ${isLast ? '' : 'pb-8'}`}>
                          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-card shadow-sm mt-0.5 bg-background">
                            {isActive ? (
                              <div className="h-full w-full rounded-full bg-destructive animate-pulse" />
                            ) : (
                              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex flex-col flex-1 gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-3 flex-1">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold leading-none">
                                    {isActive ? 'Emergency Alert Active' : 'Distress Alert Triggered'}
                                  </h4>
                                  {isActive ? (
                                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Active</Badge>
                                  ) : (
                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Resolved</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(alert.createdAt), "MMM d, yyyy 'at' h:mm a")} 
                                  <span className="hidden sm:inline">({formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })})</span>
                                </div>
                              </div>
                              
                              <div className="bg-muted/50 rounded-lg p-3 border border-border/50 text-sm grid gap-3 sm:grid-cols-2">
                                <div>
                                  <p className="text-muted-foreground text-xs mb-0.5">Trigger Source</p>
                                  <p className="font-medium capitalize">{alert.triggerSource}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-0.5">Location</p>
                                  <p className="font-medium font-mono text-xs flex items-center">
                                    <MapPin className="h-3 w-3 mr-1 opacity-70" />
                                    {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                                  <Link href={`/alerts/${alert.id}`}>View full alert details &rarr;</Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
