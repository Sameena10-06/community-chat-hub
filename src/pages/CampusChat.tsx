import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Send, Paperclip, X, MoreVertical, Edit2, Trash2 } from "lucide-react";
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

export default function CampusChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadMessages();
      const channel = supabase
        .channel("campus_messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campus_messages",
          },
          () => loadMessages()
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

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("campus_messages")
      .select(`
        *,
        profile:profiles!campus_messages_user_id_fkey(full_name, avatar_url)
      `)
      .order("created_at");

    if (data) setMessages(data);
  };


  const sendMessage = async () => {
    if (!messageText.trim() && !file) return;
    if (!user) return;

    try {
      let fileUrl = null;
      let fileName = null;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const filePath = `campus/${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("chat-files")
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
      }

      const { error } = await supabase.from("campus_messages").insert({
        user_id: user.id,
        content: messageText || "",
        file_url: fileUrl,
        file_name: fileName,
      });

      if (error) throw error;

      setMessageText("");
      setFile(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const unsendMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("campus_messages")
        .update({ deleted: true })
        .eq("id", messageId)
        .eq("user_id", user?.id);

      if (error) throw error;

      await loadMessages();
      
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

  const startEdit = (message: any) => {
    setEditingMessage(message);
    setEditText(message.content);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      const { error } = await supabase
        .from("campus_messages")
        .update({ content: editText, edited: true })
        .eq("id", editingMessage.id)
        .eq("user_id", user?.id);

      if (error) throw error;

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
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-4xl font-bold">Campus Chat</h1>
            <p className="text-muted-foreground mt-2">Share messages, files, and documents with everyone on campus</p>
          </div>

          <Card className="flex flex-col h-[calc(100vh-16rem)] shadow-lg border">
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
                        <p className="text-sm font-semibold mb-1">
                          {message.profile?.full_name}
                        </p>
                        {message.content && <p className="text-sm">{message.content}</p>}
                        {message.file_url && (
                          <a
                            href={message.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline block mt-2"
                          >
                            📎 {message.file_name}
                          </a>
                        )}
                        {message.edited && (
                          <p className="text-xs opacity-70 mt-1 italic">(edited)</p>
                        )}
                      </div>
                      {message.user_id === user?.id && (
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
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              {file && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <button onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <label>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <Button type="button" variant="outline" size="icon" asChild>
                    <span>
                      <Paperclip className="h-4 w-4" />
                    </span>
                  </Button>
                </label>
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