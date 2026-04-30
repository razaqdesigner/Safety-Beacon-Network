import { useParams } from "wouter";
import { useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, MapPin, Clock, Smartphone, User, Phone, Mail, ExternalLink } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";

export default function AlertDetail() {
  const params = useParams();
  const { data: alerts, isLoading } = useListAlerts();
  
  const alert = alerts?.find(a => a.id === params.id);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Alert Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">The alert you are looking for does not exist or has been removed.</p>
        <Button asChild>
          <Link href="/alerts">Back to Alerts</Link>
        </Button>
      </div>
    );
  }

  const isActive = alert.status === "active";
  const minutesElapsed = Math.floor((new Date().getTime() - new Date(alert.createdAt).getTime()) / 60000);
  const isHighUrgency = isActive && minutesElapsed > 5;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Alert Details</h1>
            {isActive ? (
              <Badge variant="destructive" className={`text-sm py-1 px-3 ${isHighUrgency ? 'animate-pulse' : ''}`}>
                <AlertTriangle className="h-4 w-4 mr-1.5" /> Active Emergency
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm py-1 px-3 bg-card">
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-muted-foreground" /> Resolved
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            ID: <span className="font-mono">{alert.id}</span>
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/alerts">Back</Link>
          </Button>
          <Button 
            disabled 
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
          >
            {isActive ? "Resolve (coming soon)" : "Already Resolved"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden border-border">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-primary" /> Location Data
                </CardTitle>
                <Button variant="outline" size="sm" className="h-8 text-xs bg-card" asChild>
                  <a href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}&z=16`} target="_blank" rel="noreferrer">
                    Google Maps <ExternalLink className="ml-1.5 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </CardHeader>
            <div className="h-[400px] w-full bg-muted relative">
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight={0} 
                marginWidth={0} 
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${alert.longitude-0.01}%2C${alert.latitude-0.01}%2C${alert.longitude+0.01}%2C${alert.latitude+0.01}&layer=mapnik&marker=${alert.latitude}%2C${alert.longitude}`}
                className="absolute inset-0"
              />
            </div>
            <CardContent className="pt-4 bg-card">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Latitude</p>
                  <p className="font-mono font-medium">{alert.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Longitude</p>
                  <p className="font-mono font-medium">{alert.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Accuracy</p>
                  <p className="font-medium">{alert.accuracy ? `±${alert.accuracy}m` : 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Source</p>
                  <p className="font-medium capitalize">{alert.triggerSource}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 border-l-2 border-muted space-y-6">
                <div className="relative">
                  <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                  <p className="text-sm font-medium">Alert Triggered</p>
                  <p className="text-xs text-muted-foreground mb-1">{format(new Date(alert.createdAt), "MMM d, yyyy h:mm:ss a")}</p>
                  <p className="text-sm">
                    Triggered via <span className="font-medium capitalize">{alert.triggerSource}</span> from device.
                  </p>
                </div>
                
                {isActive && (
                  <div className="relative">
                    <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-card bg-destructive animate-pulse" />
                    <p className="text-sm font-medium text-destructive">Current Status: Pending Response</p>
                    <p className="text-xs text-muted-foreground">Elapsed time: {formatDistanceToNow(new Date(alert.createdAt))}</p>
                  </div>
                )}

                {!isActive && (
                  <div className="relative">
                    <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                    <p className="text-sm font-medium text-emerald-600">Alert Resolved</p>
                    <p className="text-xs text-muted-foreground">Response recorded and case closed.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" /> Citizen Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Full Name</p>
                <p className="font-medium text-lg">{alert.user.fullName}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Contact</p>
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${alert.user.phoneNumber}`} className="text-primary hover:underline font-medium">
                    {alert.user.phoneNumber}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${alert.user.email}`} className="text-primary hover:underline text-sm">
                    {alert.user.email}
                  </a>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">National ID</p>
                <p className="font-mono text-sm bg-muted p-2 rounded-md">{alert.user.nationalId}</p>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/users/${alert.user.id}`}>View Full History</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="flex items-center">
                <Smartphone className="mr-2 h-5 w-5 text-primary" /> Device Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="secondary" className="capitalize">{alert.triggerSource}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Location Accuracy</span>
                <span className="font-medium">{alert.accuracy ? `±${alert.accuracy}m` : 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
