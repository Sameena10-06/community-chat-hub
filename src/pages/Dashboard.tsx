import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import {
  Users,
  MessageSquare,
  UserPlus,
  Bell,
  School,
  UsersRound,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    connections: 0,
    unreadNotifications: 0,
    groups: 0,
  });
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadProfile(session.user.id);
      loadStats(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) setProfile(data);
  };

  const loadStats = async (userId: string) => {
    const [connectionsRes, notificationsRes, groupsRes] = await Promise.all([
      supabase
        .from("connections")
        .select("id", { count: "exact" })
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "accepted"),
      supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .eq("read", false),
      supabase
        .from("group_members")
        .select("id", { count: "exact" })
        .eq("user_id", userId),
    ]);

    setStats({
      connections: connectionsRes.data?.length || 0,
      unreadNotifications: notificationsRes.data?.length || 0,
      groups: groupsRes.data?.length || 0,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}!</h1>
          <p className="text-muted-foreground">Here's what's happening in your network</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/connections")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Connections</p>
                <h3 className="text-3xl font-bold">{stats.connections}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/connections")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notifications</p>
                <h3 className="text-3xl font-bold">{stats.unreadNotifications}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Bell className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/groups")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Groups</p>
                <h3 className="text-3xl font-bold">{stats.groups}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <UsersRound className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/profiles")}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Find New Connections
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/connected-chat")}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Message Connections
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/campus-chat")}
              >
                <School className="mr-2 h-4 w-4" />
                Campus Chat
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate("/groups")}
              >
                <UsersRound className="mr-2 h-4 w-4" />
                Browse Groups
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Keep your profile up to date to help others connect with you
              </p>
              <Button
                className="w-full"
                onClick={() => navigate("/view-profile")}
              >
                View My Profile
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate("/profile-setup")}
              >
                Edit Profile
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
