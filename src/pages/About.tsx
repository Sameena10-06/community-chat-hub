import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Target, Zap } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Digital Campus Network</span>
          </Link>
          <Link to="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="container py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-foreground">
            About Digital Campus Network
          </h1>
          <p className="text-xl text-muted-foreground mb-12">
            Empowering students to connect, collaborate, and grow together in a
            vibrant campus community.
          </p>

          <div className="grid gap-8 md:grid-cols-3 mb-16">
            <Card className="p-6 shadow-md border">
              <Target className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Our Mission</h3>
              <p className="text-muted-foreground">
                To create meaningful connections between students across all
                departments and backgrounds.
              </p>
            </Card>
            <Card className="p-6 shadow-md border">
              <Zap className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Innovation</h3>
              <p className="text-muted-foreground">
                Leveraging modern technology to make networking seamless and
                accessible for everyone.
              </p>
            </Card>
            <Card className="p-6 shadow-md border">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Community</h3>
              <p className="text-muted-foreground">
                Building a supportive environment where students help each other
                succeed.
              </p>
            </Card>
          </div>

          <Card className="p-8 bg-muted/30 shadow-md border">
            <h2 className="text-2xl font-bold mb-4">Join Us Today</h2>
            <p className="text-muted-foreground mb-6">
              Be part of a growing community of students who are making the most
              of their campus experience. Connect with peers, join groups, and
              participate in engaging discussions.
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Get Started Now
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
