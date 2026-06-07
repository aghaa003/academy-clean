import { useEffect, useRef } from "react";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "@/pages/HomePage";
import ExamplesPage from "@/pages/ExamplesPage";
import ChallengesPage from "@/pages/ChallengesPage";
import ProblemSolvingPage from "@/pages/ProblemSolvingPage";
import CoursesPage from "@/pages/CoursesPage";
import RoadmapPage from "@/pages/RoadmapPage";
import ProjectsPage from "@/pages/ProjectsPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ProfilePage from "@/pages/ProfilePage";
import CourseWatchPage from "@/pages/CourseWatchPage";
import AdminPage from "@/pages/AdminPage";
import CommunityPage from "@/pages/CommunityPage";
import DevLinkPage from "@/pages/DevLinkPage";
import CreatorPage from "@/pages/CreatorPage";
import PublicProfilePage from "@/pages/PublicProfilePage";
import { AuthProvider, useCurrentUser } from "@/lib/auth-context";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage  from "@/pages/ResetPasswordPage";
const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function CacheInvalidator() {
  const { user } = useCurrentUser();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = user?.id ?? null;
    if (prev.current !== undefined && prev.current !== id) {
      queryClient.clear();
    }
    prev.current = id;
  }, [user]);
  return null;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/examples" component={ExamplesPage} />
      <Route path="/challenges" component={ChallengesPage} />
      <Route path="/problemsolving" component={ProblemSolvingPage} />
      <Route path="/courses" component={CoursesPage} />
      <Route path="/courses/:id" component={CourseWatchPage} />
      <Route path="/roadmap" component={RoadmapPage} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/users/:userId" component={PublicProfilePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/creator" component={CreatorPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/devlink" component={DevLinkPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
<Route path="/reset-password"  component={ResetPasswordPage} />
    </Switch>
  );
}

function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CacheInvalidator />
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <AppWithProviders />
    </WouterRouter>
  );
}
