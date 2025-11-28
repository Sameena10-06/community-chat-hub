import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Send, User, Users, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  deleted: boolean;
  edited?: boolean;
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
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
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
    if (user && selectedStudent) {
      fetchMessages();

      const channel = supabase
        .channel("open_chat_messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "open_chat_messages",
          },
          () => fetchMessages()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, selectedStudent]);

  useEffect(() => {
    if (user) {
      fetchNonConnectedStudents();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!user || !selectedStudent) {
      setMessages([]);
      return;
    }

    const { data } = await supabase
      .from("open_chat_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedStudent.id}),and(sender_id.eq.${selectedStudent.id},receiver_id.eq.${user.id})`)
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
    if (!messageText.trim() || !user || !selectedStudent) return;

    try {
      const { error } = await supabase.from("open_chat_messages").insert({
        content: messageText,
        sender_id: user.id,
        receiver_id: selectedStudent.id,
      });

      if (error) throw error;

      setMessageText("");
      await fetchMessages();
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
        .from("open_chat_messages")
        .update({ deleted: true })
        .eq("id", messageId)
        .eq("sender_id", user?.id);

      if (error) throw error;

      await fetchMessages();
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

  const startEdit = (message: Message) => {
    setEditingMessage(message);
    setEditText(message.content);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      const { error } = await supabase
        .from("open_chat_messages")
        .update({ content: editText, edited: true })
        .eq("id", editingMessage.id)
        .eq("sender_id", user?.id);

      if (error) throw error;

      await fetchMessages();
      toast({
        title: "Message updated",
        description: "Your message has been edited.",
      });
      setEditingMessage(null);
      setEditText("");
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-foreground">Non-Connected Students</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/profiles")}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Select a student to message</p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {nonConnectedStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedStudent?.id === student.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "hover:bg-muted/50"
                    }`}
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
                {selectedStudent ? `Messaging ${selectedStudent.full_name || selectedStudent.username}` : "Connect with non-connected students"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedStudent ? (
                messages.filter(m => !m.deleted).map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user?.id ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-4 ${
                        message.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-1">
                            {message.sender_id === user?.id ? "You" : selectedStudent.full_name || selectedStudent.username}
                          </p>
                          <p className="text-sm">{message.content}</p>
                          {message.edited && (
                            <p className="text-xs opacity-70 mt-1 italic">(edited)</p>
                          )}
                        </div>
                        {message.sender_id === user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-70 hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEdit(message)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => unsendMessage(message.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Unsend
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a student from the list to start messaging
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={selectedStudent ? `Message ${selectedStudent.full_name || selectedStudent.username}...` : "Type your message..."}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Message</DialogTitle>
                  <DialogDescription>Make changes to your message.</DialogDescription>
                </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Edit your message..."
              onKeyPress={(e) => e.key === "Enter" && saveEdit()}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingMessage(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={!editText.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}