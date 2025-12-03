import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Send, ArrowLeft, Users, UserPlus, Trash2, Paperclip, MoreVertical, Edit2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // First get group members
    const { data: memberData, error: memberError } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);

    if (memberError) {
      console.log("Members error:", memberError);
      return;
    }

    if (!memberData || memberData.length === 0) {
      setMembers([]);
      return;
    }

    // Then fetch profiles for each member
    const userIds = memberData.map(m => m.user_id);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .in("id", userIds);

    // Combine members with profiles
    const membersWithProfiles = memberData.map(member => ({
      ...member,
      profile: profileData?.find(p => p.id === member.user_id) || null
    }));

    console.log("Members with profiles:", membersWithProfiles);
    setMembers(membersWithProfiles);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("group_messages")
      .select(`
        *,
        profile:profiles(full_name, avatar_url, username)
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
    if ((!messageText.trim() && !attachedFile) || !user) return;

    try {
      let fileUrl = null;
      let fileName = null;

      if (attachedFile) {
        const fileExt = attachedFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-files")
          .upload(filePath, attachedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from("chat-files")
          .createSignedUrl(filePath, 3600 * 24 * 365);

        fileUrl = urlData?.signedUrl || null;
        fileName = attachedFile.name;
      }

      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        user_id: user.id,
        content: messageText.trim() || "(file)",
        file_url: fileUrl,
        file_name: fileName,
      });

      if (error) throw error;
      setMessageText("");
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const deleteGroup = async () => {
    try {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
      
      toast({
        title: "Group deleted",
        description: "The group has been deleted successfully.",
      });
      navigate("/groups");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const removeMember = async (memberId: string, memberUserId: string) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "The member has been removed from the group.",
      });
      loadMembers();
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
        .from("group_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      
      toast({
        title: "Message deleted",
        description: "Message has been removed.",
      });
      loadMessages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const openEditDialog = (message: any) => {
    setEditingMessage(message);
    setEditContent(message.content);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editContent.trim() || !editingMessage) return;

    try {
      const { error } = await supabase
        .from("group_messages")
        .update({ content: editContent, edited: true })
        .eq("id", editingMessage.id);

      if (error) throw error;

      toast({
        title: "Message updated",
        description: "Your message has been edited.",
      });

      setEditDialogOpen(false);
      setEditingMessage(null);
      setEditContent("");
      loadMessages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download file",
      });
    }
  };

  const availableConnections = connections
    .filter((conn) => {
      const otherId = conn.requester_id === user?.id ? conn.receiver.id : conn.requester.id;
      return !members.some((m) => m.user_id === otherId);
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
            
            <Button size="sm" variant="outline" onClick={() => setMembersDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              View Members ({members.length})
            </Button>

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
                  <DialogDescription>Select connections to add to this group.</DialogDescription>
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

            {group?.created_by === user?.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the group and all its messages. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Group Members ({members.length})</DialogTitle>
                <DialogDescription>All members in this group</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url} />
                      <AvatarFallback>
                        {member.profile?.full_name?.charAt(0) || member.profile?.username?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.profile?.full_name || member.profile?.username || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">@{member.profile?.username || "unknown"}</p>
                    </div>
                    {member.user_id === group?.created_by && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Creator</span>
                    )}
                    {group?.created_by === user?.id && member.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeMember(member.id, member.user_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Card className="flex flex-col h-[600px]">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.user_id === user?.id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex items-start gap-2 max-w-[70%]">
                    {message.user_id !== user?.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.profile?.avatar_url} />
                        <AvatarFallback>
                          {message.profile?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`rounded-lg p-4 ${
                        message.user_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold">
                          {message.profile?.full_name || message.profile?.username}
                        </p>
                        {message.user_id === user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(message)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => unsendMessage(message.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <p className="text-sm">{message.content}</p>
                      {message.edited && (
                        <p className="text-xs opacity-70 mt-1">(edited)</p>
                      )}
                      {message.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => downloadFile(message.file_url, message.file_name)}
                        >
                          <Paperclip className="mr-2 h-4 w-4" />
                          {message.file_name}
                        </Button>
                      )}
                    </div>
                    {message.user_id === user?.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.profile?.avatar_url} />
                        <AvatarFallback>
                          {message.profile?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              {attachedFile && (
                <div className="mb-2 p-2 bg-muted rounded-md flex items-center justify-between">
                  <span className="text-sm truncate">{attachedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAttachedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAttachedFile(file);
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Message</DialogTitle>
                <DialogDescription>Update your message content</DialogDescription>
              </DialogHeader>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                placeholder="Edit your message..."
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveEdit}>Save Changes</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
