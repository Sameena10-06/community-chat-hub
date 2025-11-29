import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import logo from "@/assets/logo.jpg";

const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter";
  }
  const numericCount = (password.match(/[0-9]/g) || []).length;
  if (numericCount < 2) {
    return "Password must contain at least 2 numeric characters";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least 1 special character";
  }
  return null;
};

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/profile-setup");
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const passwordError = validatePassword(password);
        if (passwordError) {
          toast({
            variant: "destructive",
            title: "Invalid Password",
            description: passwordError,
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile-setup`,
            data: {
              username: username,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Account created! Please complete your profile.",
        });
        navigate("/profile-setup");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!profile?.full_name) {
          navigate("/profile-setup");
        } else {
          navigate("/view-profile");
        }

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lg border">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="DCN Logo" className="w-16 h-16 object-cover rounded-full mb-4" />
          <h1 className="text-3xl font-bold text-foreground">
            {isSignUp ? "Join Campus Network" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground mt-2 text-center">
            {isSignUp
              ? "Create your account to get started"
              : "Sign in to continue connecting"}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={!isSignUp ? "default" : "outline"}
            className="flex-1"
            onClick={() => setIsSignUp(false)}
          >
            Login
          </Button>
          <Button
            type="button"
            variant={isSignUp ? "default" : "outline"}
            className="flex-1"
            onClick={() => setIsSignUp(true)}
          >
            Register
          </Button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {isSignUp && (
              <p className="text-xs text-muted-foreground">
                Must be 8+ chars with 1 uppercase, 2 numbers, 1 special character
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
