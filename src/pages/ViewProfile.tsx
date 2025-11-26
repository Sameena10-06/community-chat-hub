import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { User, Edit } from "lucide-react";

export default function ViewProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Profile not found. Please complete your profile setup.</p>
            <Button onClick={() => navigate("/profile-setup")}>
              Complete Profile
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold">My Profile</h1>
            <Button onClick={() => navigate("/profile-setup")}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>

          <Card className="p-8">
            <div className="flex items-start gap-6 mb-8">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{profile.full_name}</h2>
                <p className="text-lg text-muted-foreground mb-1">{profile.department}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            {profile.about_me && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">About Me</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.about_me}</p>
              </div>
            )}

            {profile.soft_skills?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Soft Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.soft_skills.map((skill: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.technical_skills?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Technical Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.technical_skills.map((skill: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.achievements && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Achievements</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.achievements}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
