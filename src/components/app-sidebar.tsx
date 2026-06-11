
'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { 
  LayoutDashboard, 
  History, 
  PlusSquare, 
  Settings, 
  CreditCard, 
  Info, 
  LogOut, 
  ShieldCheck,
  Plus,
  User,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { UserProfile } from "@/lib/types";

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() } as UserProfile);
    });
  }, [user, db]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed out successfully" });
      router.push("/login");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign out failed" });
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Audit History", href: "/history", icon: History },
    { label: "Add AI System", href: "/systems/new", icon: PlusSquare },
    { label: "New Assessment", href: "/assessments/new", icon: Plus },
    { label: "Billing & Plans", href: "/billing", icon: CreditCard },
    { label: "How it Works", href: "/how-it-works", icon: Info },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const isPro = profile?.subscriptionStatus === 'pro' || profile?.subscriptionStatus === 'enterprise';

  return (
    <aside className="fixed left-0 top-0 hidden h-full w-[260px] flex-col border-r bg-card md:flex z-50">
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-accent p-1.5 rounded-md shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter text-foreground">DISA Audit</span>
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspace</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-all group",
                isActive 
                  ? "bg-accent/10 text-accent border-l-4 border-accent" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-4">
        <div className="bg-muted/40 rounded-xl p-3 border">
           <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <User className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate text-foreground">{user?.email}</p>
                <div className="flex items-center gap-1">
                   {isPro ? (
                     <Badge variant="outline" className="text-[8px] bg-accent/10 text-accent border-accent/20 h-4 px-1">
                       <Crown className="w-2 h-2 mr-1" /> PRO
                     </Badge>
                   ) : (
                     <Badge variant="outline" className="text-[8px] h-4 px-1 uppercase">Free Plan</Badge>
                   )}
                </div>
              </div>
           </div>
           {!isPro && (
             <Button variant="outline" size="sm" className="w-full text-[10px] h-7 font-bold border-accent text-accent hover:bg-accent hover:text-white" asChild>
                <Link href="/billing">Upgrade Plan</Link>
             </Button>
           )}
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-bold h-9"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
