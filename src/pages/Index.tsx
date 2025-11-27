import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Network, Award, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FeatureCard } from "@/components/FeatureCard";
import campusHero from "@/assets/campus-hero.jpg";
import logo from "@/assets/logo.jpg";

const Index = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        window.location.href = "/view-profile";
      } else {
        setUser(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        window.location.href = "/view-profile";
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img src={logo} alt="DCN Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold text-brand">Digital Campus Network</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/">
              <Button variant="ghost" className="text-base">Home</Button>
            </Link>
            {!user && (
              <Link to="/about">
                <Button variant="ghost" className="text-base">About Us</Button>
              </Link>
            )}
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90 px-6">Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-muted/30 py-24 md:py-32">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${campusHero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Connect, Collaborate & <span className="text-primary">Grow</span>
            </h1>
            <p className="mb-10 text-xl text-muted-foreground md:text-2xl leading-relaxed">
              Join your campus community. Network with fellow students, showcase
              your skills, and build meaningful connections.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg bg-primary hover:bg-primary/90">
                  Sign In
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg border-2">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container">
          <h2 className="text-center text-4xl font-bold mb-16 text-foreground">Why Join Us?</h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            <FeatureCard
              icon={Network}
              title="Build Your Network"
              description="Connect with students across departments, share knowledge, and grow together."
            />
            <FeatureCard
              icon={Award}
              title="Showcase Skills"
              description="Create detailed profiles highlighting your technical skills, achievements, and projects."
            />
            <FeatureCard
              icon={MessageSquare}
              title="Stay Connected"
              description="Chat with peers, collaborate on projects, and share documents seamlessly."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/30">
        <div className="container text-center">
          <h2 className="mb-6 text-4xl font-bold text-foreground">
            Ready to Connect?
          </h2>
          <p className="mb-10 text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of students already networking on campus.
          </p>
          <Link to="/auth">
            <Button size="lg" className="px-8 py-6 text-lg bg-primary hover:bg-primary/90">
              Create Your Profile
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-background">
        <div className="container text-center">
          <p className="text-muted-foreground text-sm">
            &copy; 2024 Digital Campus Network. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
