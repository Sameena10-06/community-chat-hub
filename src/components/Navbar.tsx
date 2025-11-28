import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import logo from "@/assets/logo.jpg";

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <img src={logo} alt="DCN Logo" className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold text-brand">Digital Campus Network</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">Home</Button>
          </Link>
          <Link to="/chat">
            <Button variant="ghost" size="sm">Open Chat</Button>
          </Link>
          {user && (
            <>
              <Link to="/connected-chat">
                <Button variant="ghost" size="sm">Connected Chat</Button>
              </Link>
              <Link to="/campus-chat">
                <Button variant="ghost" size="sm">Campus Chat</Button>
              </Link>
              <Link to="/connections">
                <Button variant="ghost" size="sm">Connections</Button>
              </Link>
              <Link to="/profiles">
                <Button variant="ghost" size="sm">Profiles</Button>
              </Link>
              <Link to="/groups">
                <Button variant="ghost" size="sm">Groups</Button>
              </Link>
            </>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu />
          </div>
        ) : (
          <Button
            onClick={() => navigate("/auth")}
            variant="default"
            size="sm"
          >
            Sign In
          </Button>
        )}
      </div>
    </nav>
  );
}
