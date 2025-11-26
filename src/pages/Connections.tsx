import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Bell, Check, X, User, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
  related_user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  department: string;
  email: string;
  about_me: string;
  soft_skills: string[];
  technical_skills: string[];
  achievements: string;
  avatar_url: string;
}

export default function Connections() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const { toast } = useToast();

  const viewProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setSelectedProfile(data);
  };

  useEffect(() => {
    loadData();
    subscribeToNotifications();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: notifs } = await supabase
      .from("notifications")
      .select(`
        *,
        related_user:profiles!notifications_related_user_id_fkey(id, full_name, avatar_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (notifs) setNotifications(notifs as any);

    const { data: conns } = await supabase
      .from("connections")
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url),
        receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url)
      `)
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (conns) setConnections(conns);
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleConnectionRequest = async (
    notificationId: string,
    connectionId: string,
    accept: boolean
  ) => {
    try {
      if (accept) {
        await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", connectionId);

        toast({
          title: "Connection accepted!",
          description: "You are now connected.",
        });
      } else {
        await supabase
          .from("connections")
          .update({ status: "rejected" })
          .eq("id", connectionId);
      }

      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    loadData();
  };

  const connectionRequests = notifications.filter(
    (n) => n.type === "connection_request" && !n.read
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Connections & Notifications</h1>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList>
            <TabsTrigger value="requests">
              Requests ({connectionRequests.length})
            </TabsTrigger>
            <TabsTrigger value="connections">
              My Connections ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4 mt-6">
            {connectionRequests.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No pending connection requests
              </Card>
            ) : (
              connectionRequests.map((notification) => (
                <Card key={notification.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {notification.related_user?.avatar_url ? (
                        <img
                          src={notification.related_user.avatar_url}
                          alt={notification.related_user.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">
                          {notification.related_user?.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {notification.content}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const { data: connection } = await supabase
                            .from("connections")
                            .select("id")
                            .eq("requester_id", notification.related_user.id)
                            .eq("receiver_id", currentUserId)
                            .eq("status", "pending")
                            .single();
                          if (connection) {
                            handleConnectionRequest(
                              notification.id,
                              connection.id,
                              true
                            );
                          }
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const { data: connection } = await supabase
                            .from("connections")
                            .select("id")
                            .eq("requester_id", notification.related_user.id)
                            .eq("receiver_id", currentUserId)
                            .eq("status", "pending")
                            .single();
                          if (connection) {
                            handleConnectionRequest(
                              notification.id,
                              connection.id,
                              false
                            );
                          }
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((conn) => {
                const otherUser =
                  conn.requester_id === currentUserId
                    ? conn.receiver
                    : conn.requester;
                return (
                  <Card key={conn.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {otherUser?.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt={otherUser.full_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold">{otherUser?.full_name}</h3>
                          <Badge variant="default" className="mt-1">
                            Connected
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewProfile(otherUser?.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-6">
            {notifications.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No notifications
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-6 ${!notification.read ? "border-primary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Bell className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">
                          {notification.related_user?.full_name || "System"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {notification.content}
                        </p>
                      </div>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Profile Details</DialogTitle>
            </DialogHeader>
            {selectedProfile && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  {selectedProfile.avatar_url ? (
                    <img
                      src={selectedProfile.avatar_url}
                      alt={selectedProfile.full_name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">{selectedProfile.full_name}</h2>
                    <p className="text-muted-foreground">{selectedProfile.department}</p>
                    <p className="text-sm text-muted-foreground">{selectedProfile.email}</p>
                  </div>
                </div>

                {selectedProfile.about_me && (
                  <div>
                    <h3 className="font-semibold mb-2">About Me</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedProfile.about_me}
                    </p>
                  </div>
                )}

                {selectedProfile.soft_skills?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Soft Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.soft_skills.map((skill, i) => (
                        <Badge key={i} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProfile.technical_skills?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Technical Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.technical_skills.map((skill, i) => (
                        <Badge key={i} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProfile.achievements && (
                  <div>
                    <h3 className="font-semibold mb-2">Achievements</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedProfile.achievements}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
