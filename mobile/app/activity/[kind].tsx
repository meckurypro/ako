import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path, Rect } from "react-native-svg";
import { Text } from "@/components/core";
import { PostCard } from "@/components/feed/PostCard";
import { useAffiliateProjects, useDraftPosts, useEventsActivity, useLikedPosts, useLikedProjects, useSavedPosts, useSavedProjects, useViewHistory } from "@/features/activity/api";
import { useTheme } from "@/providers/ThemeProvider";

type HubTab = "posts" | "projects";

const titles: Record<string, string> = { saved: "Saved", liked: "Liked", drafts: "Drafts", scheduled: "Scheduled", history: "History", events: "Events & meetings", affiliates: "Affiliates" };

export default function ActivityDetail() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [hubTab, setHubTab] = useState<HubTab>("posts");
  const savedPosts = useSavedPosts();
  const likedPosts = useLikedPosts();
  const drafts = useDraftPosts(kind === "scheduled" ? "scheduled" : "draft");
  const savedProjects = useSavedProjects();
  const likedProjects = useLikedProjects();
  const history = useViewHistory();
  const affiliates = useAffiliateProjects();
  const events = useEventsActivity();

  if (kind === "saved" || kind === "liked") {
    const postQuery = kind === "saved" ? savedPosts : likedPosts;
    const projectQuery = kind === "saved" ? savedProjects : likedProjects;
    const data = hubTab === "posts" ? postQuery.data ?? [] : projectQuery.data ?? [];
    const loading = hubTab === "posts" ? postQuery.isLoading : projectQuery.isLoading;
    const refreshing = hubTab === "posts" ? postQuery.isRefetching : projectQuery.isRefetching;
    const title = kind === "saved" ? "Saved" : "Liked";
    return <View style={[s.root, { backgroundColor: colors.background }]}><HubHeader title={title} tab={hubTab} onChange={setHubTab} />{loading ? <ActivityIndicator color={colors.accent} style={s.loader} /> : <FlatList data={data} keyExtractor={(item: any, index) => item.id ?? `${index}`} contentContainerStyle={s.savedList} ItemSeparatorComponent={() => <View style={{ height: 14 }} />} refreshing={refreshing} onRefresh={() => { void postQuery.refetch(); void projectQuery.refetch(); }} ListEmptyComponent={<Text color="muted" align="center" style={s.empty}>{hubTab === "posts" ? `Nothing ${kind} yet.` : `No ${kind} projects yet.`}</Text>} renderItem={({ item }: any) => hubTab === "posts" ? <HubPostCard post={item} showDelete={kind === "saved"} /> : <ProjectRow item={item} kind={kind} />} /> }<BottomNavigation /></View>;
  }

  if (kind === "drafts") {
    const rows = drafts.data ?? [];
    return <View style={[s.root, { backgroundColor: colors.background }]}><PlainHeader title="Drafts" />{drafts.isLoading ? <ActivityIndicator color={colors.accent} style={s.loader} /> : <FlatList data={rows} keyExtractor={(item: any) => item.id} contentContainerStyle={s.draftList} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} refreshing={drafts.isRefetching} onRefresh={() => void drafts.refetch()} ListEmptyComponent={<DraftEmpty />} renderItem={({ item }: any) => <DraftCard draft={item} />} />}</View>;
  }

  if (kind === "scheduled") {
    const rows = drafts.data ?? [];
    return <View style={[s.root, { backgroundColor: colors.background }]}><PlainHeader title="Scheduled" />{drafts.isLoading ? <ActivityIndicator color={colors.accent} style={s.loader} /> : <FlatList data={rows} keyExtractor={(item: any) => item.id} contentContainerStyle={s.draftList} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} refreshing={drafts.isRefetching} onRefresh={() => void drafts.refetch()} ListEmptyComponent={<ScheduledEmpty />} renderItem={({ item }: any) => <ScheduledCard post={item} />} />}</View>;
  }

  if (kind === "history") {
    const rows = history.data ?? [];
    return <View style={[s.root, { backgroundColor: colors.background }]}><PlainHeader title="History" />{history.isLoading ? <ActivityIndicator color={colors.accent} style={s.loader} /> : <FlatList data={rows} keyExtractor={(item: any, index) => `${item.kind}-${item.value?.id ?? index}-${item.viewedAt}`} contentContainerStyle={s.historyList} refreshing={history.isRefetching} onRefresh={() => void history.refetch()} ListEmptyComponent={<HistoryEmpty />} renderItem={({ item }: any) => <HistoryRow item={item} />} /> }<BottomNavigation /></View>;
  }

  const projects: any[] = kind === "affiliates" ? affiliates.data?.map((x: any) => x.project).filter(Boolean) ?? [] : kind === "events" ? events.data ?? [] : [];
  const loading = kind === "events" ? events.isLoading : affiliates.isLoading;
  return <View style={[s.root, { backgroundColor: colors.background }]}><View style={[s.header, { borderBottomColor: colors.border }]}><Pressable onPress={() => router.back()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={22} color={colors.textSecondary} /></Pressable><Text style={s.title}>{titles[kind] ?? "Activity"}</Text></View>{loading ? <ActivityIndicator color={colors.accent} style={s.loader} /> : <FlatList data={projects} keyExtractor={(item: any, index) => item.id ?? `${index}`} contentContainerStyle={s.list} ItemSeparatorComponent={() => <View style={{ height: 14 }} />} ListEmptyComponent={<Text color="muted" align="center" style={s.empty}>{kind === "events" ? "Events, meetings, and rooms you've joined will show up here." : "Nothing here yet."}</Text>} renderItem={({ item }: any) => <ProjectRow item={item.value ?? item} kind={kind ?? ""} />} />}</View>;
}

function PlainHeader({ title }: { title: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  return <View style={[s.plainHeader, { backgroundColor: colors.background }]}><Pressable onPress={() => router.back()} style={s.back}><Feather name="arrow-left" size={22} color={colors.textSecondary} /></Pressable><Text style={s.savedTitle}>{title}</Text></View>;
}

function HubHeader({ title, tab, onChange }: { title: string; tab: HubTab; onChange: (tab: HubTab) => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  return <View style={[s.savedHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}><View style={s.savedTitleRow}><Pressable onPress={() => router.back()} style={s.back}><Feather name="arrow-left" size={22} color={colors.textSecondary} /></Pressable><Text style={s.savedTitle}>{title}</Text></View><View style={[s.savedTabs, { borderBottomColor: colors.border }]}><Pressable onPress={() => onChange("posts")} style={s.savedTab}><Text style={[s.savedTabText, { color: tab === "posts" ? colors.accent : colors.textMuted }]}>Posts</Text></Pressable><Pressable onPress={() => onChange("projects")} style={s.savedTab}><Text style={[s.savedTabText, { color: tab === "projects" ? colors.accent : colors.textMuted }]}>Projects</Text></Pressable><View style={[s.savedTabLine, { backgroundColor: colors.accent, left: tab === "posts" ? 0 : "50%" }]} /></View></View>;
}

function HubPostCard({ post, showDelete }: { post: any; showDelete: boolean }) {
  const { colors } = useTheme();
  return <View style={s.savedPostWrap}><PostCard post={post} />{showDelete ? <Pressable style={[s.deletePill, { backgroundColor: colors.danger }]}><Feather name="trash-2" size={13} color="#120B09" /><Text style={s.deleteText}>Delete</Text></Pressable> : null}</View>;
}

function DraftCard({ draft }: { draft: any }) {
  const router = useRouter();
  const { colors } = useTheme();
  const date = draft.category_id ? new Date(draft.created_at).toLocaleDateString() : null;
  const preview = draft.content?.trim() || "(No text yet - just media or a heading.)";
  return <View style={[s.draftCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={s.draftMeta}><View style={[s.draftChip, { backgroundColor: colors.background, borderColor: colors.border }]}><Text color="secondary" style={s.draftChipText}>Draft</Text></View>{date ? <Text color="muted" style={s.draftDate}>{date}</Text> : null}</View>{draft.heading ? <Text numberOfLines={1} style={s.draftHeading}>{draft.heading}</Text> : null}<Text color="secondary" numberOfLines={3} style={s.draftPreview}>{preview}</Text><View style={s.draftActions}><Pressable onPress={() => router.push({ pathname: "/modals/create", params: { draftId: draft.id } } as any)} style={[s.resumeButton, { backgroundColor: colors.accent }]}><Text style={[s.resumeText, { color: colors.background }]}>Resume</Text></Pressable><Pressable accessibilityLabel="Discard draft" style={[s.discardButton, { borderColor: colors.border }]}><Feather name="trash-2" size={16} color={colors.textSecondary} /></Pressable></View></View>;
}

function DraftEmpty() {
  const { colors } = useTheme();
  return <View style={s.draftEmpty}><Feather name="edit-3" size={32} color={colors.textMuted} /><Text style={s.emptyTitle}>No drafts yet</Text><Text color="secondary" align="center" style={s.emptyMessage}>Start a post and choose Save as draft instead of posting. It will show up here.</Text></View>;
}

function timeUntil(iso?: string | null) {
  if (!iso) return "";
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "publishing shortly";
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins} min${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hr${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

function ScheduledCard({ post }: { post: any }) {
  const router = useRouter();
  const { colors } = useTheme();
  const preview = post.content?.trim() || "(No text yet.)";
  const when = post.scheduled_for ? new Date(post.scheduled_for).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;
  return <View style={[s.scheduledCard, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}><View style={s.scheduledTop}><View style={s.scheduledStatus}><Feather name="send" size={12} color={colors.accent} /><Text color="accent" style={s.scheduledStatusText}>Publishes {timeUntil(post.scheduled_for)}</Text></View><Pressable accessibilityLabel="Cancel scheduled post" style={s.cancelScheduled}><Feather name="x" size={16} color={colors.textSecondary} /></Pressable></View>{post.heading ? <Text numberOfLines={1} style={s.draftHeading}>{post.heading}</Text> : null}<Text color="secondary" numberOfLines={3} style={s.draftPreview}>{preview}</Text>{when ? <Text color="muted" style={s.scheduledDate}>{when}</Text> : null}<View style={s.draftActions}><Pressable onPress={() => router.push({ pathname: "/modals/create", params: { scheduledId: post.id } } as any)} style={[s.resumeButton, { backgroundColor: colors.accent }]}><View style={s.resumeContent}><Feather name="edit-3" size={14} color={colors.background} /><Text style={[s.resumeText, { color: colors.background }]}>Resume</Text></View></Pressable></View></View>;
}

function ScheduledEmpty() {
  const { colors } = useTheme();
  return <View style={s.draftEmpty}><Feather name="send" size={32} color={colors.textMuted} /><Text style={s.emptyTitle}>Nothing scheduled</Text><Text color="secondary" align="center" style={s.emptyMessage}>Choose Schedule instead of posting to queue something for later. It will show up here.</Text></View>;
}

function HistoryRow({ item }: { item: any }) {
  const router = useRouter();
  const { colors } = useTheme();
  const isPost = item.kind === "post";
  const value = item.value;
  const title = isPost ? value.heading || value.content?.slice(0, 80) || "Post" : value.title ?? "Project";
  const subtitle = isPost ? `Post by ${value.author?.display_name ?? "someone"}` : "Project";
  const thumbnail = isPost ? null : value.thumbnail_url;
  const date = new Date(item.viewedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const open = () => isPost ? router.push({ pathname: "/posts/[postId]", params: { postId: value.id } }) : undefined;
  return <Pressable onPress={open} style={[s.historyRow, { borderBottomColor: colors.border }]}><View style={[s.historyThumb, { backgroundColor: colors.surface }]}>{thumbnail ? <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Feather name={isPost ? "file-text" : "image"} size={16} color={colors.textMuted} />}</View><View style={s.historyCopy}><Text numberOfLines={1} style={s.historyTitle}>{title}</Text><Text color="muted" style={s.historySubtitle}>{subtitle}</Text></View><Text color="muted" style={s.historyDate}>{date}</Text></Pressable>;
}

function HistoryEmpty() {
  const { colors } = useTheme();
  return <View style={s.historyEmpty}><Feather name="clock" size={24} color={colors.textMuted} /><Text color="muted" align="center" style={s.emptyMessage}>Posts and projects you open will show up here, most recent first.</Text></View>;
}

function ProjectRow({ item, kind }: { item: any; kind: string }) {
  const { colors } = useTheme();
  return <View style={[s.project, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialCommunityIcons name={kind === "events" ? "calendar-clock-outline" : "folder-outline"} size={22} color={colors.accent} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600" }}>{item.title ?? "Project"}</Text><Text color="secondary" numberOfLines={1} style={{ fontSize: 12 }}>{item.when ? new Date(item.when).toLocaleString() : item.description ?? "Project"}</Text></View></View>;
}

function FeedIcon({ color }: { color: string }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 11.5 12 4l9 7.5" /><Path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" /></Svg>;
}

function LibraryIcon({ color }: { color: string }) {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><Rect width={8} height={18} x={3} y={3} rx={1} /><Path d="M7 3v18" /><Path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z" /></Svg>;
}

function BottomNavigation() {
  const router = useRouter();
  const { colors } = useTheme();
  const items = [
    { label: "Feed", onPress: () => router.push("/(tabs)/home"), icon: <FeedIcon color={colors.textMuted} /> },
    { label: "Discover", onPress: () => router.push("/(tabs)/discover"), icon: <Feather name="search" size={24} color={colors.textMuted} strokeWidth={1.75} /> },
    { label: "Library", onPress: () => router.push("/(tabs)/create"), icon: <LibraryIcon color={colors.textMuted} /> },
    { label: "Messages", onPress: () => router.push("/(tabs)/inbox"), icon: <Feather name="message-circle" size={24} color={colors.textMuted} strokeWidth={1.75} /> },
    { label: "Profile", onPress: () => router.push("/(tabs)/profile"), icon: <Feather name="user" size={24} color={colors.textMuted} strokeWidth={1.75} /> },
  ];
  return <View style={[s.bottomNav, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>{items.map((item) => <Pressable key={item.label} onPress={item.onPress} style={s.navItem}>{item.icon}<Text color="muted" style={s.navLabel}>{item.label}</Text></Pressable>)}</View>;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 28, height: 32, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "serif", fontSize: 24 },
  plainHeader: { height: 76, paddingHorizontal: 16, paddingTop: 18, flexDirection: "row", alignItems: "center", gap: 10 },
  savedHeader: { borderBottomWidth: StyleSheet.hairlineWidth },
  savedTitleRow: { height: 76, paddingHorizontal: 16, paddingTop: 18, flexDirection: "row", alignItems: "center", gap: 10 },
  savedTitle: { fontFamily: "serif", fontSize: 30, lineHeight: 36 },
  savedTabs: { height: 53, marginHorizontal: 18, flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, position: "relative" },
  savedTab: { flex: 1, alignItems: "center", justifyContent: "center" },
  savedTabText: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  savedTabLine: { position: "absolute", bottom: -1, width: "50%", height: 2, borderRadius: 2 },
  loader: { marginTop: 48 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110, flexGrow: 1 },
  savedList: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110, flexGrow: 1 },
  draftList: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 110, flexGrow: 1 },
  historyList: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 110, flexGrow: 1 },
  savedPostWrap: { position: "relative" },
  deletePill: { position: "absolute", top: 16, right: 14, height: 31, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 5 },
  deleteText: { color: "#120B09", fontSize: 13, lineHeight: 16, fontWeight: "600" },
  empty: { paddingTop: 52 },
  draftCard: { borderWidth: 1, borderStyle: "dashed", borderRadius: 16, padding: 16 },
  draftMeta: { marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  draftChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  draftChipText: { fontSize: 11, lineHeight: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: .4 },
  draftDate: { fontSize: 11, lineHeight: 14 },
  draftHeading: { marginBottom: 4, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  draftPreview: { fontSize: 14, lineHeight: 20 },
  draftActions: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  resumeButton: { flex: 1, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  resumeContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  resumeText: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  discardButton: { width: 38, height: 38, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  scheduledCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16 },
  scheduledTop: { marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  scheduledStatus: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  scheduledStatusText: { fontSize: 12, lineHeight: 16, fontWeight: "700" },
  cancelScheduled: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  scheduledDate: { marginTop: 8, fontSize: 11, lineHeight: 15 },
  draftEmpty: { paddingHorizontal: 28, paddingVertical: 64, alignItems: "center" },
  emptyTitle: { marginTop: 12, fontSize: 16, lineHeight: 21, fontWeight: "600" },
  emptyMessage: { marginTop: 5, fontSize: 14, lineHeight: 20 },
  historyRow: { minHeight: 68, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12 },
  historyThumb: { width: 44, height: 44, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  historyCopy: { flex: 1, minWidth: 0 },
  historyTitle: { fontSize: 14, lineHeight: 19 },
  historySubtitle: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  historyDate: { fontSize: 12, lineHeight: 16 },
  historyEmpty: { marginTop: 64, paddingHorizontal: 34, alignItems: "center", gap: 8 },
  project: { minHeight: 64, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, height: 76, borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", flexDirection: "row", paddingTop: 13 },
  navItem: { flex: 1, alignItems: "center", gap: 5 },
  navLabel: { fontSize: 11, lineHeight: 14, fontWeight: "500" },
});
