import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetBroadcastReachQueryKey,
  getListBroadcastsQueryKey,
  useCreateBroadcast,
  useGetBroadcastReach,
  useListBroadcasts,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2, Send, Smartphone, Users } from "lucide-react";
import { format } from "date-fns";

const TITLE_MAX = 65;
const BODY_MAX = 240;

function errorMessage(err: unknown): string {
  const data = (err as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === "string" ? data.error : "Couldn't send the notification. Please try again.";
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: reach, isLoading: isLoadingReach } = useGetBroadcastReach();
  const { data: broadcasts, isLoading: isLoadingHistory } = useListBroadcasts();
  const { mutate: send, isPending: isSending } = useCreateBroadcast({
    mutation: {
      onSuccess: (broadcast) => {
        setTitle("");
        setBody("");
        queryClient.invalidateQueries({ queryKey: getListBroadcastsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBroadcastReachQueryKey() });
        toast({
          title: "Notification sent",
          description:
            broadcast.recipientCount > 0
              ? `Posted to every citizen's inbox. Push delivered to ${broadcast.sentCount} of ${broadcast.recipientCount} devices.`
              : "Posted to every citizen's inbox. No devices have push notifications enabled yet.",
        });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Not sent", description: errorMessage(err) });
      },
    },
  });

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !isSending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Send an announcement to every registered citizen on the mobile app.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5 text-primary" /> New notification
            </CardTitle>
            <CardDescription>
              Appears in the app's notifications inbox and as a push notification on devices that allow it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSend) setConfirmOpen(true);
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Title</Label>
                  <span className="text-xs text-muted-foreground">{title.length}/{TITLE_MAX}</span>
                </div>
                <Input
                  id="title"
                  maxLength={TITLE_MAX}
                  placeholder="e.g. Road closure on Allen Avenue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="body">Message</Label>
                  <span className="text-xs text-muted-foreground">{body.length}/{BODY_MAX}</span>
                </div>
                <Textarea
                  id="body"
                  rows={4}
                  maxLength={BODY_MAX}
                  placeholder="What should citizens know or do?"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={!canSend}>
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send to all citizens
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                {isLoadingReach ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold leading-none">{reach?.totalUsers ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">citizens — in-app inbox</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                {isLoadingReach ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold leading-none">{reach?.pushEnabledUsers ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">devices — push notification</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold tracking-tight">Sent notifications</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification</TableHead>
                <TableHead>Sent by</TableHead>
                <TableHead>Push delivery</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHistory ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : !broadcasts || broadcasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Bell className="mb-2 h-8 w-8 opacity-50" />
                      <p>No notifications sent yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                broadcasts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="max-w-md">
                      <p className="font-medium text-foreground">{b.title}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{b.body}</p>
                    </TableCell>
                    <TableCell className="text-sm">{b.sentByName ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {b.recipientCount === 0 ? (
                        <span className="text-muted-foreground">Inbox only</span>
                      ) : (
                        <span>
                          {b.sentCount}/{b.recipientCount}
                          {b.failedCount > 0 && (
                            <span className="ml-1 text-destructive">({b.failedCount} failed)</span>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(b.createdAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to all {reach?.totalUsers ?? ""} citizens?</AlertDialogTitle>
            <AlertDialogDescription>
              “{title.trim()}” will appear in every citizen's notifications inbox
              {reach && reach.pushEnabledUsers > 0
                ? ` and be pushed to ${reach.pushEnabledUsers} device${reach.pushEnabledUsers === 1 ? "" : "s"}`
                : ""}
              . This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => send({ data: { title: title.trim(), body: body.trim() } })}>
              Send notification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
