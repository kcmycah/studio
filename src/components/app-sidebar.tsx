'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { 
  LayoutDashboard, 
  History, 
  PlusSquare, 
  Settings, 
  CreditCard, 
  Info, 
  LogOut, 
  ShieldCheck,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed out" });
      router.push("/login");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign out failed" });
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "History", href: "/history", icon: History },
    { label: "Add System", href: "/systems/new", icon: PlusSquare },
    { label: "New Assessment", href: "/assessments/new", icon: Plus },
    { label: "Billing", href: "/billing", icon: CreditCard },
    { label: "How it Works", href: "/how-it-works", icon: Info },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 hidden h-full w-[260px] flex-col border-r bg-card md:flex shadow-sm z-50">
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-accent" />
          <span className="text-lg font-bold tracking-tight">DISA Audit</span>
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all group",
                isActive 
                  ? "bg-accent/10 text-accent border-l-4 border-accent" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
