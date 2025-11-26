import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import ProfileSetup from "./pages/ProfileSetup";
import Profiles from "./pages/Profiles";
import Connections from "./pages/Connections";
import ConnectedChat from "./pages/ConnectedChat";
import CampusChat from "./pages/CampusChat";
import Dashboard from "./pages/Dashboard";
import ViewProfile from "./pages/ViewProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/view-profile" element={<ViewProfile />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/connected-chat" element={<ConnectedChat />} />
          <Route path="/campus-chat" element={<CampusChat />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/group-chat" element={<GroupChat />} />
          <Route path="/about" element={<About />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
