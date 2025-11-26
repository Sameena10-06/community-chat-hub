import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Send, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  username: string;
  user_id: string;
  created_at: string;
  deleted: boolean;
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  department: string;
}

export default function Chat() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [nonConnectedStudents, setNonConnectedStudents] = useState<Profile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchNonConnectedStudents();

      const channel = supabase
        .channel("messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => fetchMessages()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  const fetchNonConnectedStudents = async () => {
    if (!user) return;

    const { data: connections } = await supabase
      .from("connections")
      .select("requester_id, receiver_id")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "accepted");

    const connectedIds = connections?.flatMap(c => 
      [c.requester_id, c.receiver_id]
    ).filter(id => id !== user.id) || [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, department")
      .neq("id", user.id)
      .not("id", "in", `(${connectedIds.join(",") || "null"})`);

    if (profiles) setNonConnectedStudents(profiles);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("messages").insert({
        content: messageText,
        user_id: user.id,
        username: profile?.username || "Anonymous",
      });

      if (error) throw error;

      setMessageText("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: error.message,
      });
    }
  };

  const unsendMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ deleted: true })
        .eq("id", messageId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Message deleted",
        description: "Your message has been removed.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Students List */}
          <Card className="lg:col-span-1 h-[calc(100vh-12rem)] flex flex-col shadow-lg border">
            <div className="p-4 border-b border-border bg-muted/30">
              <h2 className="text-lg font-semibold text-foreground">Non-Connected Students</h2>
              <p className="text-xs text-muted-foreground">Click to view profile</p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {nonConnectedStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => navigate(`/profiles`)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Avatar>
                      <AvatarImage src={student.avatar_url} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{student.full_name || student.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.department}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 h-[calc(100vh-12rem)] flex flex-col shadow-lg border">
            <div className="p-6 border-b border-border bg-muted/30">
              <h1 className="text-2xl font-bold text-foreground">Open Chat</h1>
              <p className="text-muted-foreground">
                Connect with non-connected students
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.filter(m => !m.deleted).map((message) => (
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-1">{message.username}</p>
                        <p className="text-sm">{message.content}</p>
                      </div>
                      {message.user_id === user?.id && (
                        <button
                          onClick={() => unsendMessage(message.id)}
                          className="text-xs opacity-70 hover:opacity-100"
                        >
                          Unsend
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} disabled={!messageText.trim()}>
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
