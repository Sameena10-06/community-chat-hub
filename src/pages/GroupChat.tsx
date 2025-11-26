import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Send, ArrowLeft, Users, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function GroupChat() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [user, setUser] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) {
      navigate("/groups");
      return;
    }
    loadUser();
    loadGroup();
    loadMembers();
    loadMessages();
    subscribeToMessages();
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    loadConnections(user.id);
  };

  const loadConnections = async (userId: string) => {
    const { data } = await supabase
      .from("connections")
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, full_name),
        receiver:profiles!connections_receiver_id_fkey(id, full_name)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted");

    if (data) setConnections(data);
  };

  const loadGroup = async () => {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (data) setGroup(data);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from("group_members")
      .select(`
        *,
        profile:profiles(id, full_name, avatar_url)
      `)
      .eq("group_id", groupId);

    if (data) setMembers(data);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("group_messages")
      .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
      .eq("group_id", groupId)
      .order("created_at");

    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group_${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !user) return;

    try {
      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        user_id: user.id,
        content: messageText,
      });

      if (error) throw error;
      setMessageText("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const addMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const inserts = selectedUsers.map((userId) => ({
        group_id: groupId,
        user_id: userId,
      }));

      const { error } = await supabase.from("group_members").insert(inserts);

      if (error) throw error;

      toast({
        title: "Members added!",
        description: "New members have been added to the group.",
      });

      setSelectedUsers([]);
      setDialogOpen(false);
      loadMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const availableConnections = connections
    .filter((conn) => {
      const otherId = conn.requester_id === user?.id ? conn.receiver.id : conn.requester.id;
      return !members.some((m) => m.profile.id === otherId);
    })
    .map((conn) => ({
      id: conn.requester_id === user?.id ? conn.receiver.id : conn.requester.id,
      name: conn.requester_id === user?.id ? conn.receiver.full_name : conn.requester.full_name,
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/groups")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold flex-1">{group?.name}</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Members
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Members to Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select from your connections:
                  </p>
                  {availableConnections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No available connections to add
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {availableConnections.map((conn) => (
                        <div key={conn.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={conn.id}
                            checked={selectedUsers.includes(conn.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers([...selectedUsers, conn.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter((id) => id !== conn.id));
                              }
                            }}
                          />
                          <Label htmlFor={conn.id} className="cursor-pointer">
                            {conn.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={addMembers}
                    disabled={selectedUsers.length === 0}
                  >
                    Add Selected ({selectedUsers.length})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="mb-6 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
            </div>
          </Card>

          <Card className="flex flex-col h-[600px]">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.user_id === user?.id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.user_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm font-semibold mb-1">{message.profile?.full_name}</p>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
