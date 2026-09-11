// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation, type Location } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import { RequireAuth } from "./components/RequireAuth";
import { ScrollToTop } from "./components/ScrollToTop";
import { PathHistoryTracker } from "./components/PathHistoryTracker";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { usePageThemeSync } from "./hooks/usePageThemeSync";
import { ToastProvider } from "./components/Toast";

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
import { FollowListPage } from "./pages/FollowListPage";
import { MyProfileRedirect } from "./pages/MyProfileRedirect";
import { MyInboxRedirect } from "./pages/MyInboxRedirect";

import { Pages } from "./pages/Pages";
import { CreatePage } from "./pages/CreatePage";
import { PagePage } from "./pages/PagePage";
import { PageTeam } from "./pages/PageTeam";
import { EditPage } from "./pages/EditPage";

import { WalletPage } from "./pages/Wallet";
import { FundWallet } from "./pages/FundWallet";
import { Withdraw } from "./pages/Withdraw";

import { Notifications } from "./pages/Notifications";
import { FollowRequests } from "./pages/FollowRequests";
import { ConversationList } from "./pages/ConversationList";
import { PageInbox } from "./pages/PageInbox";
import { PageMessageThread } from "./pages/PageMessageThread";
import { Archive } from "./pages/Archive";
import { MessageThread } from "./pages/MessageThread";
import { HiddenMessages } from "./pages/HiddenMessages";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";

import { RequireAdmin } from "./components/RequireAdmin";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminHome } from "./pages/admin/AdminHome";
import { AdminCategories } from "./pages/admin/AdminCategories";
import { AdminGiftTypes } from "./pages/admin/AdminGiftTypes";
import { AdminReportReasons } from "./pages/admin/AdminReportReasons";
import { AdminProjectTypes } from "./pages/admin/AdminProjectTypes";
import { AdminAccountExemptions } from "./pages/admin/AdminAccountExemptions";
import { AdminModeration } from "./pages/admin/AdminModeration";
import { AdminReports } from "./pages/admin/AdminReports";
import { AdminSmtpSettings } from "./pages/admin/AdminSmtpSettings";
import { AdminEmailTemplates } from "./pages/admin/AdminEmailTemplates";
import { AdminEmailTemplateEditor } from "./pages/admin/AdminEmailTemplateEditor";
import { AdminEmailCampaigns } from "./pages/admin/AdminEmailCampaigns";
import { AdminEmailCampaignEditor } from "./pages/admin/AdminEmailCampaignEditor";
import { AdminSendNotification } from "./pages/admin/AdminSendNotification";

import { CreateProject } from "./pages/CreateProject";
import { EditProject } from "./pages/EditProject";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Room } from "./pages/Room";
import { Course } from "./pages/Course";
import { MeetingRoom } from "./pages/MeetingRoom";
import { TicketView } from "./pages/TicketView";
import { EventCheckIn } from "./pages/EventCheckIn";
import { Activity } from "./pages/Activity";
import { DraftPosts } from "./pages/DraftPosts";
import { ScheduledPosts } from "./pages/ScheduledPosts";
import { CreateChoice } from "./pages/CreateChoice";
import { SavedHub } from "./pages/SavedHub";
import { LikedHub } from "./pages/LikedHub";
import { EventsActivity } from "./pages/EventsActivity";
import { HistoryActivity } from "./pages/HistoryActivity";

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
      <LoadingOverlay />
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <PathHistoryTracker />
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

/**
 * Split out from App() so it can call useLocation() (needs to be
 * inside <BrowserRouter>) to implement React Router's "modal route"
 * pattern: /create is meant to render as a sheet over whatever page
 * it was opened from (Feed, ProfilePage, ...), not as its own blank
 * screen. TopHeader/ProfilePage's "+" link now passes
 * `state={{ background: location }}` when navigating to /create —
 * when that's present, the MAIN Routes below renders the ORIGINAL
 * page (using that remembered location) so it stays mounted
 * underneath, and a second, modal-only Routes renders /create on top
 * of it. Visiting /create directly (no background state — e.g. a
 * fresh page load or shared link) still falls through to the normal
 * entry in the main Routes below and renders full-screen, unchanged.
 */
function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = (location.state as { background?: Location } | null)?.background;
  usePageThemeSync();

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
            <Route path="/" element={<Navigate to="/feed" replace />} />

            {/* Auth */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* Separate entry point for admins — not wrapped in
                RequireAuth (an admin may not have a normal session
                yet), and it does its own admin_roles check + sign-out
                on failure before ever reaching /admin. */}
            <Route path="/admin/login" element={<AdminLogin />} />

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
              path="/create"
              element={
                <RequireAuth>
                  <CreateChoice />
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
                  <Settings />
                </RequireAuth>
              }
            />

            {/* Account mode: organisation/brand pages */}
            <Route
              path="/pages"
              element={
                <RequireAuth>
                  <Pages />
                </RequireAuth>
              }
            />
            <Route
              path="/pages/new"
              element={
                <RequireAuth>
                  <CreatePage />
                </RequireAuth>
              }
            />
            {/* Public — a shared page link should load for a logged-out
                visitor, same reasoning as ProjectDetail/Course below. */}
            <Route path="/page/:username" element={<PagePage />} />
            <Route
              path="/page/:username/team"
              element={
                <RequireAuth>
                  <PageTeam />
                </RequireAuth>
              }
            />
            <Route
              path="/page/:username/edit"
              element={
                <RequireAuth>
                  <EditPage />
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
            {/* Folded into the Activity hub's Saved tab now (see
                SavedHub.tsx) — kept as a redirect so any stale links
                still land somewhere valid. */}
            <Route path="/bookmarks" element={<Navigate to="/activity/saved" replace />} />
            <Route
              path="/messages"
              element={
                <RequireAuth>
                  <ConversationList />
                </RequireAuth>
              }
            />
            {/* /inbox is what BottomNav's Messages tab actually links to
                — routes to here (personal) or /page-inbox (page mode)
                depending on active identity. See MyInboxRedirect. */}
            <Route
              path="/inbox"
              element={
                <RequireAuth>
                  <MyInboxRedirect />
                </RequireAuth>
              }
            />
            <Route
              path="/page-inbox"
              element={
                <RequireAuth>
                  <PageInbox />
                </RequireAuth>
              }
            />
            <Route
              path="/page-inbox/:conversationId"
              element={
                <RequireAuth>
                  <PageMessageThread />
                </RequireAuth>
              }
            />
            <Route
              path="/messages/archive"
              element={
                <RequireAuth>
                  <Archive />
                </RequireAuth>
              }
            />
            <Route
              path="/messages/:conversationId/hidden"
              element={
                <RequireAuth>
                  <HiddenMessages />
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
            {/* Old dedicated sub-pages are folded into the single /settings
                hub now — keep the routes as redirects so any stale links
                (bookmarks, browser history) still land somewhere valid. */}
            <Route path="/settings/advanced" element={<Navigate to="/settings" replace />} />
            <Route path="/settings/appearance" element={<Navigate to="/settings" replace />} />

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
            <Route
              path="/admin/project-types"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminProjectTypes />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/account-exemptions"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminAccountExemptions />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/moderation"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminModeration />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/smtp"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminSmtpSettings />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/emails/templates"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminEmailTemplates />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/emails/templates/:templateId"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminEmailTemplateEditor />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/emails/campaigns"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminEmailCampaigns />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/emails/campaigns/:campaignId"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminEmailCampaignEditor />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/notifications/send"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminSendNotification />
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
            <Route
              path="/projects/:projectId/ticket"
              element={
                <RequireAuth>
                  <TicketView />
                </RequireAuth>
              }
            />
            <Route
              path="/projects/:projectId/checkin"
              element={
                <RequireAuth>
                  <EventCheckIn />
                </RequireAuth>
              }
            />
            <Route
              path="/rooms/:projectId"
              element={
                <RequireAuth>
                  <Room />
                </RequireAuth>
              }
            />
            {/* Public — same reasoning as ProjectDetail: a shared course
                link should load for a logged-out visitor, who then just
                sees the "buy to unlock" state Course.tsx already handles. */}
            <Route path="/courses/:projectId" element={<Course />} />
            <Route
              path="/meetings/:projectId"
              element={
                <RequireAuth>
                  <MeetingRoom />
                </RequireAuth>
              }
            />
            <Route
              path="/activity"
              element={
                <RequireAuth>
                  <Activity />
                </RequireAuth>
              }
            />
            <Route
              path="/activity/saved"
              element={
                <RequireAuth>
                  <SavedHub />
                </RequireAuth>
              }
            />
            <Route
              path="/activity/liked"
              element={
                <RequireAuth>
                  <LikedHub />
                </RequireAuth>
              }
            />
            <Route
              path="/activity/drafts"
              element={
                <RequireAuth>
                  <DraftPosts />
                </RequireAuth>
              }
            />
            <Route
              path="/activity/scheduled"
              element={
                <RequireAuth>
                  <ScheduledPosts />
                </RequireAuth>
              }
            />
            <Route
              path="/activity/history"
              element={
                <RequireAuth>
                  <HistoryActivity />
                </RequireAuth>
              }
            />
            <Route
              path="/activity/events"
              element={
                <RequireAuth>
                  <EventsActivity />
                </RequireAuth>
              }
            />
            {/* Folded into the Activity hub's Saved tab now — kept as a
                redirect so any stale links still land somewhere valid. */}
            <Route path="/saved-projects" element={<Navigate to="/activity/saved" replace />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route
            path="/create"
            element={
              <RequireAuth>
                <CreateChoice />
              </RequireAuth>
            }
          />
        </Routes>
      )}
    </>
  );
}
