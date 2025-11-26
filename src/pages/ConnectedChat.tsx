import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Send, Paperclip, User, X } from "lucide-react";

export default function ConnectedChat() {
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      loadMessages();
      subscribeToMessages();
    }
  }, [selectedConnection]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("connections")
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url),
        receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url)
      `)
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (data) setConnections(data);
  };

  const loadMessages = async () => {
    if (!selectedConnection || !user) return;

    const { data } = await supabase
      .from("connected_messages")
      .select(`
        *,
        sender:profiles!connected_messages_sender_id_fkey(full_name)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${selectedConnection},receiver_id.eq.${selectedConnection}`)
      .order("created_at");

    if (data) {
      const filtered = data.filter(
        (msg) =>
          (msg.sender_id === user.id && msg.receiver_id === selectedConnection) ||
          (msg.sender_id === selectedConnection && msg.receiver_id === user.id)
      );
      setMessages(filtered);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("connected_messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connected_messages",
        },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!messageText.trim() && !file) return;
    if (!user || !selectedConnection) return;

    try {
      let fileUrl = null;
      let fileName = null;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;

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

      const { error } = await supabase.from("connected_messages").insert({
        sender_id: user.id,
        receiver_id: selectedConnection,
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
        .from("connected_messages")
        .update({ deleted: true })
        .eq("id", messageId)
        .eq("sender_id", user?.id);

      if (error) throw error;
      loadMessages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const selectedUser = connections.find(
    (c) => 
      (c.requester_id === selectedConnection || c.receiver_id === selectedConnection)
  );
  const otherUser = selectedUser
    ? selectedUser.requester_id === user?.id
      ? selectedUser.receiver
      : selectedUser.requester
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Connected Chat</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 p-4">
            <h2 className="font-semibold mb-4">Your Connections</h2>
            <div className="space-y-2">
              {connections.map((conn) => {
                const other = conn.requester_id === user?.id ? conn.receiver : conn.requester;
                return (
                  <button
                    key={conn.id}
                    onClick={() => setSelectedConnection(other.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedConnection === other.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {other.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt={other.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8" />
                      )}
                      <span className="text-sm font-medium">{other.full_name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="md:col-span-3 flex flex-col h-[600px]">
            {selectedConnection ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    {otherUser?.avatar_url ? (
                      <img
                        src={otherUser.avatar_url}
                        alt={otherUser.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10" />
                    )}
                    <h2 className="font-semibold">{otherUser?.full_name}</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.filter(m => !m.deleted).map((message) => (
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
                          </div>
                          {message.sender_id === user?.id && (
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a connection to start chatting
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
