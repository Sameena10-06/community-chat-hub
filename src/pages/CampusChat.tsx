import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Send, Paperclip, X, MoreVertical, Edit2, Trash2, Plus, MessageSquare } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CampusChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [editText, setEditText] = useState("");
  const [chatrooms, setChatrooms] = useState<any[]>([]);
  const [selectedChatroom, setSelectedChatroom] = useState<any | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChatroomName, setNewChatroomName] = useState("");
  const [newChatroomDescription, setNewChatroomDescription] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
    loadChatrooms();
  }, []);

  useEffect(() => {
    if (user && selectedChatroom) {
      loadMessages();
      const channel = supabase
        .channel(`campus_messages_${selectedChatroom.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campus_messages",
            filter: `chatroom_id=eq.${selectedChatroom.id}`,
          },
          () => loadMessages()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, selectedChatroom]);

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

    if (data) {
      setChatrooms(data);
      if (!selectedChatroom && data.length > 0) {
        setSelectedChatroom(data[0]);
      }
    }
  };

  const loadMessages = async () => {
    if (!selectedChatroom) return;
    
    const { data } = await supabase
      .from("campus_messages")
      .select(`
        *,
        profile:profiles!campus_messages_user_id_fkey(full_name, avatar_url)
      `)
      .eq("chatroom_id", selectedChatroom.id)
      .order("created_at");

    if (data) setMessages(data);
  };


  const createChatroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatroomName.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from("chatrooms")
        .insert({
          name: newChatroomName,
          description: newChatroomDescription,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Chatroom created!",
        description: `${newChatroomName} has been created.`,
      });

      setNewChatroomName("");
      setNewChatroomDescription("");
      setCreateDialogOpen(false);
      loadChatrooms();
      setSelectedChatroom(data);
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
    if (!user || !selectedChatroom) return;

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

        const { data } = await supabase.storage
          .from("chat-files")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

        fileUrl = data?.signedUrl || null;
        fileName = file.name;
      }

      const { error } = await supabase.from("campus_messages").insert({
        user_id: user.id,
        content: messageText || "",
        file_url: fileUrl,
        file_name: fileName,
        chatroom_id: selectedChatroom.id,
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
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold">Campus Chat</h1>
              <p className="text-muted-foreground mt-2">Join chatrooms to connect with students</p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Chatroom
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Chatroom</DialogTitle>
                  <DialogDescription>Create a new chatroom for campus discussions.</DialogDescription>
                </DialogHeader>
                <form onSubmit={createChatroom} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chatroomName">Chatroom Name</Label>
                    <Input
                      id="chatroomName"
                      value={newChatroomName}
                      onChange={(e) => setNewChatroomName(e.target.value)}
                      placeholder="e.g., General Discussion"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chatroomDescription">Description</Label>
                    <Textarea
                      id="chatroomDescription"
                      value={newChatroomDescription}
                      onChange={(e) => setNewChatroomDescription(e.target.value)}
                      placeholder="What's this chatroom about?"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Chatroom
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Chatrooms Sidebar */}
            <Card className="md:col-span-1 p-4 h-[calc(100vh-16rem)] overflow-y-auto">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chatrooms
              </h2>
              <div className="space-y-2">
                {chatrooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedChatroom(room)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChatroom?.id === room.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium text-sm">{room.name}</div>
                    {room.description && (
                      <div className="text-xs opacity-80 truncate mt-1">
                        {room.description}
                      </div>
                    )}
                  </button>
                ))}
                {chatrooms.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No chatrooms yet. Create one to get started!
                  </p>
                )}
              </div>
            </Card>

            {/* Messages Area */}
            <Card className="md:col-span-3 flex flex-col h-[calc(100vh-16rem)] shadow-lg border">
              {selectedChatroom ? (
                <>
                  <div className="p-4 border-b">
                    <h2 className="font-semibold text-lg">{selectedChatroom.name}</h2>
                    {selectedChatroom.description && (
                      <p className="text-sm text-muted-foreground">{selectedChatroom.description}</p>
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
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No chatroom selected</h3>
                    <p className="text-muted-foreground">
                      Select a chatroom or create a new one to start chatting
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
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