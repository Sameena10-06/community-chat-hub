import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Send, Paperclip, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CampusChat() {
  const [chatrooms, setChatrooms] = useState<any[]>([]);
  const [selectedChatroom, setSelectedChatroom] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState<any>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadChatrooms();
  }, []);

  useEffect(() => {
    if (selectedChatroom) {
      loadMessages();
      subscribeToMessages();
    }
  }, [selectedChatroom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadChatrooms = async () => {
    const { data } = await supabase
      .from("chatrooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setChatrooms(data);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("campus_messages")
      .select(`
        *,
        profile:profiles!campus_messages_user_id_fkey(full_name, avatar_url)
      `)
      .eq("chatroom_id", selectedChatroom)
      .order("created_at");

    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
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
  };

  const createChatroom = async () => {
    if (!newRoomName.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from("chatrooms")
        .insert({
          name: newRoomName,
          description: newRoomDesc,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Chatroom created!",
        description: "Your chatroom is ready.",
      });
      setNewRoomName("");
      setNewRoomDesc("");
      setDialogOpen(false);
      loadChatrooms();
      setSelectedChatroom(data.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
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
        chatroom_id: selectedChatroom,
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
      loadMessages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const selectedRoom = chatrooms.find((r) => r.id === selectedChatroom);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold">Campus Chat</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Chatroom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Chatroom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Chatroom Name</Label>
                  <Input
                    id="name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter chatroom name"
                  />
                </div>
                <div>
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="What's this chatroom about?"
                  />
                </div>
                <Button onClick={createChatroom} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 p-4">
            <h2 className="font-semibold mb-4">Chatrooms</h2>
            <div className="space-y-2">
              {chatrooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedChatroom(room.id)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedChatroom === room.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <p className="font-medium">{room.name}</p>
                  {room.description && (
                    <p className="text-xs opacity-70 mt-1">{room.description}</p>
                  )}
                </button>
              ))}
            </div>
          </Card>

          <Card className="md:col-span-3 flex flex-col h-[600px]">
            {selectedChatroom ? (
              <>
                <div className="p-4 border-b">
                  <h2 className="font-semibold">{selectedRoom?.name}</h2>
                  {selectedRoom?.description && (
                    <p className="text-sm text-muted-foreground">{selectedRoom.description}</p>
                  )}
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
                Select a chatroom or create one to start chatting
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
