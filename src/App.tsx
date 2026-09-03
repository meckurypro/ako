import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import { RequireAuth } from "./components/RequireAuth";
import { ScrollToTop } from "./components/ScrollToTop";

import { SignUp } from "./pages/auth/SignUp";
import { Login } from "./pages/auth/Login";
import { VerifyEmail } from "./pages/auth/VerifyEmail";
import { ResetPassword } from "./pages/auth/ResetPassword";
import { AuthCallback } from "./pages/auth/AuthCallback";

import { InterestPicker } from "./pages/onboarding/InterestPicker";

import { Feed } from "./pages/Feed";
import { Compose } from "./pages/Compose";
import { EditPost } from "./pages/EditPost";
import { PostDetail } from "./pages/PostDetail";
import { HashtagFeed } from "./pages/HashtagFeed";
import { Discover } from "./pages/Discover";

import { ProfilePage } from "./pages/ProfilePage";
import { EditProfile } from "./pages/EditProfile";
import { FollowListPage } from "./pages/FollowListPage";
import { MyProfileRedirect } from "./pages/MyProfileRedirect";

import { WalletPage } from "./pages/Wallet";
import { FundWallet } from "./pages/FundWallet";
import { Withdraw } from "./pages/Withdraw";

import { Notifications } from "./pages/Notifications";
import { FollowRequests } from "./pages/FollowRequests";
import { Bookmarks } from "./pages/Bookmarks";
import { ConversationList } from "./pages/ConversationList";
import { ArchivedConversations } from "./pages/ArchivedConversations";
import { MessageThread } from "./pages/MessageThread";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";
import { AdvancedSettings } from "./pages/AdvancedSettings";

import { RequireAdmin } from "./components/RequireAdmin";
import { AdminHome } from "./pages/admin/AdminHome";
import { AdminCategories } from "./pages/admin/AdminCategories";
import { AdminGiftTypes } from "./pages/admin/AdminGiftTypes";
import { AdminReportReasons } from "./pages/admin/AdminReportReasons";
import { AdminReports } from "./pages/admin/AdminReports";

import { CreateProject } from "./pages/CreateProject";
import { EditProject } from "./pages/EditProject";
import { ProjectDetail } from "./pages/ProjectDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Navigate to="/feed" replace />} />

            {/* Auth */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Onboarding */}
            <Route
              path="/onboarding/interests"
              element={
                <RequireAuth>
                  <InterestPicker />
                </RequireAuth>
              }
            />

            {/* Core */}
            <Route
              path="/feed"
              element={
                <RequireAuth>
                  <Feed />
                </RequireAuth>
              }
            />
            <Route
              path="/compose"
              element={
                <RequireAuth>
                  <Compose />
                </RequireAuth>
              }
            />
            <Route
              path="/post/:postId"
              element={
                <RequireAuth>
                  <PostDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/post/:postId/edit"
              element={
                <RequireAuth>
                  <EditPost />
                </RequireAuth>
              }
            />
            <Route
              path="/hashtag/:tag"
              element={
                <RequireAuth>
                  <HashtagFeed />
                </RequireAuth>
              }
            />
            <Route
              path="/topics"
              element={
                <RequireAuth>
                  <Discover />
                </RequireAuth>
              }
            />

            {/* Profile */}
            <Route
              path="/me"
              element={
                <RequireAuth>
                  <MyProfileRedirect />
                </RequireAuth>
              }
            />
            <Route
              path="/profile/:username"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile/:username/followers"
              element={
                <RequireAuth>
                  <FollowListPage type="followers" />
                </RequireAuth>
              }
            />
            <Route
              path="/profile/:username/following"
              element={
                <RequireAuth>
                  <FollowListPage type="following" />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/profile"
              element={
                <RequireAuth>
                  <EditProfile />
                </RequireAuth>
              }
            />

            {/* Wallet */}
            <Route
              path="/wallet"
              element={
                <RequireAuth>
                  <WalletPage />
                </RequireAuth>
              }
            />
            <Route
              path="/wallet/fund"
              element={
                <RequireAuth>
                  <FundWallet />
                </RequireAuth>
              }
            />
            <Route
              path="/wallet/withdraw"
              element={
                <RequireAuth>
                  <Withdraw />
                </RequireAuth>
              }
            />

            {/* Notifications, bookmarks, messaging */}
            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <Notifications />
                </RequireAuth>
              }
            />
            <Route
              path="/requests"
              element={
                <RequireAuth>
                  <FollowRequests />
                </RequireAuth>
              }
            />
            <Route
              path="/bookmarks"
              element={
                <RequireAuth>
                  <Bookmarks />
                </RequireAuth>
              }
            />
            <Route
              path="/messages"
              element={
                <RequireAuth>
                  <ConversationList />
                </RequireAuth>
              }
            />
            <Route
              path="/messages/archive"
              element={
                <RequireAuth>
                  <ArchivedConversations />
                </RequireAuth>
              }
            />
            <Route
              path="/messages/:conversationId"
              element={
                <RequireAuth>
                  <MessageThread />
                </RequireAuth>
              }
            />
            <Route
              path="/search"
              element={
                <RequireAuth>
                  <Search />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/advanced"
              element={
                <RequireAuth>
                  <AdvancedSettings />
                </RequireAuth>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminHome />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminCategories />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/gift-types"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminGiftTypes />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/report-reasons"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminReportReasons />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminReports />
                  </RequireAdmin>
                </RequireAuth>
              }
            />

            {/* Projects */}
            <Route
              path="/projects/new"
              element={
                <RequireAuth>
                  <CreateProject />
                </RequireAuth>
              }
            />
            {/* Public — a shared project link should work for a
                logged-out visitor. Buy/Download inside ProjectCard
                gate themselves and send an unauthenticated visitor to
                /login?redirect=... instead of failing silently. */}
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route
              path="/projects/:projectId/edit"
              element={
                <RequireAuth>
                  <EditProject />
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
              }
