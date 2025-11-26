import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import { User, Search, UserPlus, CheckCircle, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function Profiles() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [connections, setConnections] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadProfiles();
    loadCurrentUser();
    loadConnections();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    if (data) setProfiles(data);
  };

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("connections")
      .select("*")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
    if (data) setConnections(data);
  };

  const getConnectionStatus = (profileId: string) => {
    const connection = connections.find(
      (c) =>
        (c.requester_id === currentUserId && c.receiver_id === profileId) ||
        (c.receiver_id === currentUserId && c.requester_id === profileId)
    );
    return connection;
  };

  const sendConnectionRequest = async (profileId: string) => {
    try {
      const { error } = await supabase.from("connections").insert({
        requester_id: currentUserId,
        receiver_id: profileId,
        status: "pending",
      });

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: profileId,
        type: "connection_request",
        content: "sent you a connection request",
        related_user_id: currentUserId,
      });

      toast({
        title: "Request sent!",
        description: "Connection request has been sent.",
      });
      loadConnections();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.id !== currentUserId &&
      (p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.department?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Student Profiles</h1>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => {
            const connection = getConnectionStatus(profile.id);
            return (
              <Card key={profile.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{profile.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{profile.department}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {profile.technical_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profile.technical_skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedProfile(profile)}
                  >
                    View Profile
                  </Button>
                  {!connection && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/chat")}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => sendConnectionRequest(profile.id)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {connection?.status === "accepted" && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                  {connection?.status === "pending" && (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

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
