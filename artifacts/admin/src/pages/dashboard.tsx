import { useGetAlertStats, useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Users, Activity, CheckCircle2, ShieldAlert, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useGetAlertStats();
  const { data: alerts, isLoading: isLoadingAlerts } = useListAlerts();

  const activeAlerts = alerts?.filter(a => a.status === "active").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Monitor community safety alerts and active distress signals.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Alerts"
          value={stats?.activeAlerts}
          icon={AlertTriangle}
          isLoading={isLoadingStats}
          trend={stats?.activeAlerts && stats.activeAlerts > 0 ? "Requires immediate action" : "All clear"}
          trendColor={stats?.activeAlerts && stats.activeAlerts > 0 ? "text-destructive font-medium" : "text-emerald-500 font-medium"}
          className={stats?.activeAlerts && stats.activeAlerts > 0 ? "border-destructive/50 bg-destructive/5" : ""}
        />
        <StatCard
          title="Alerts (Last 24h)"
          value={stats?.alertsLast24h}
          icon={Activity}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Total Alerts"
          value={stats?.totalAlerts}
          icon={ShieldAlert}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Registered Citizens"
          value={stats?.totalUsers}
          icon={Users}
          isLoading={isLoadingStats}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight">Live Active Queue</h2>
          <Link href="/alerts" className="text-sm font-medium text-primary hover:underline">
            View all alerts &rarr;
          </Link>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {isLoadingAlerts ? (
              <div className="divide-y divide-border">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeAlerts.length > 0 ? (
              <div className="divide-y divide-border">
                {activeAlerts.map(alert => {
                  const minutesElapsed = Math.floor((new Date().getTime() - new Date(alert.createdAt).getTime()) / 60000);
                  const isHighUrgency = minutesElapsed > 5;

                  return (
                    <Link 
                      key={alert.id} 
                      href={`/alerts/${alert.id}`}
                      className={`block p-4 hover:bg-muted/50 transition-colors ${isHighUrgency ? "bg-destructive/5 hover:bg-destructive/10" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isHighUrgency ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-orange-500 text-white'}`}>
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium leading-none text-foreground">
                              {alert.user.fullName}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {alert.user.phoneNumber} &bull; Triggered via {alert.triggerSource}
                            </p>
                            {isHighUrgency && (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold border-transparent bg-destructive text-destructive-foreground">
                                High Urgency
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-foreground">All Clear</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  There are currently no active distress alerts in the community.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  isLoading, 
  trend,
  trendColor = "text-muted-foreground",
  className = ""
}: { 
  title: string; 
  value?: number; 
  icon: any; 
  isLoading: boolean;
  trend?: string;
  trendColor?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value !== undefined ? value.toLocaleString() : '-'}</div>
        )}
        {trend && !isLoading && (
          <p className={`text-xs mt-1 ${trendColor}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
