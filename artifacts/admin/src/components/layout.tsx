import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ShieldAlert, LayoutDashboard, AlertTriangle, Users, Bell, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAdminMeQueryKey, useAdminLogout, useGetAdminMe } from "@workspace/api-client-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { data: admin } = useGetAdminMe({
    query: { queryKey: getGetAdminMeQueryKey(), retry: false, staleTime: Infinity },
  });
  const { mutate: logout, isPending: isLoggingOut } = useAdminLogout({
    mutation: {
      onSettled: () => {
        queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== getGetAdminMeQueryKey()[0] });
        void queryClient.resetQueries({ queryKey: getGetAdminMeQueryKey() });
      },
    },
  });
  const initials = (admin?.name ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Alerts", href: "/alerts", icon: AlertTriangle },
    { name: "Users", href: "/users", icon: Users },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <ShieldAlert className="mr-2 h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            SafeAlert
          </span>
          <span className="ml-2 rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            Admin
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-sm font-bold">{initials || "OP"}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-none">{admin?.name ?? "Operations"}</p>
              <p className="text-xs text-muted-foreground">Active Dispatcher</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              disabled={isLoggingOut}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <div className="flex items-center">
            <ShieldAlert className="mr-2 h-6 w-6 text-primary" />
            <span className="text-lg font-bold">SafeAlert</span>
          </div>
          <nav className="flex gap-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium ${
                  location === item.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => logout()}
              disabled={isLoggingOut}
              aria-label="Sign out"
              className="text-muted-foreground disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
