import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users as UsersIcon, User } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function Groups() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
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

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load groups",
      });
    } else {
      setGroups(data || []);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    setLoading(true);

    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: newGroupName,
          description: newGroupDescription,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as first member
      const membersToAdd = [user.id, ...selectedMembers];
      const { error: memberError } = await supabase
        .from("group_members")
        .insert(
          membersToAdd.map((userId) => ({
            group_id: groupData.id,
            user_id: userId,
          }))
        );

      if (memberError) throw memberError;

      toast({
        title: "Success!",
        description: "Group created successfully",
      });

      setNewGroupName("");
      setNewGroupDescription("");
      setSelectedMembers([]);
      setDialogOpen(false);
      fetchGroups();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create group",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Groups</h1>
              <p className="text-muted-foreground mt-2">
                Join or create groups to collaborate
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>Create a new group to collaborate with your connections.</DialogDescription>
                </DialogHeader>
                <form onSubmit={createGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupDescription">Description</Label>
                    <Textarea
                      id="groupDescription"
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="What's this group about?"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Add Members (Connected Students)</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                      {connections.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No connections available</p>
                      ) : (
                        connections.map((conn) => {
                          const other = conn.requester_id === user?.id ? conn.receiver : conn.requester;
                          return (
                            <label key={other.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted rounded-md">
                              <input
                                type="checkbox"
                                checked={selectedMembers.includes(other.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMembers([...selectedMembers, other.id]);
                                  } else {
                                    setSelectedMembers(selectedMembers.filter(id => id !== other.id));
                                  }
                                }}
                                className="rounded border-input"
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={other.avatar_url} />
                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{other.full_name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating..." : "Create Group"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.id} className="p-6 shadow-md hover:shadow-lg transition-shadow border">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <UsersIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{group.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {group.description || "No description"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/group-chat?id=${group.id}`)}
                    >
                      Open Chat
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {groups.length === 0 && (
            <Card className="p-12 text-center shadow-md border">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a group!
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
