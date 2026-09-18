import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text } from "@/components/core";
import { EmptyState, ErrorState } from "@/components/feedback";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { PostCard } from "@/components/feed/PostCard";
import { useActiveIdentity } from "@/features/compose/api";
import { useFeed } from "@/features/feed/api";
import type { FeedMode, Post } from "@/features/feed/types";
import { usePageNotifications, usePersonalNotifications } from "@/features/notifications/api";
import { useTheme } from "@/providers/ThemeProvider";

const MODES: { key: FeedMode; label: string }[] = [{ key: "ranked", label: "For You" }, { key: "top", label: "Top Discussions" }, { key: "following", label: "Following" }];

export default function HomeScreen() {
  const [mode, setMode] = useState<FeedMode>("ranked"); const feed = useFeed(mode); const { colors } = useTheme(); const router = useRouter();
  const identity = useActiveIdentity(); const pageId = identity.data?.mode === "page" ? identity.data.page.id : undefined;
  const personalNotifications = usePersonalNotifications(!pageId); const pageNotifications = usePageNotifications(pageId, !!pageId);
  const unread = (pageId ? pageNotifications.data : personalNotifications.data)?.filter((item) => !item.read_at).length ?? 0;
  const posts = feed.data?.pages.flat() ?? []; const render = useCallback(({ item }: { item: Post }) => <PostCard post={item} />, []);
  const empty = mode === "following" ? "Follow people to build your feed." : mode === "top" ? "Top discussions will appear as the community engages." : "Your AKọ is quiet right now.";
  return <View style={[s.root, { backgroundColor: colors.background }]}><View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}><View style={s.top}><Pressable accessibilityLabel="Create" onPress={() => router.push("/modals/create")} style={s.icon}><MaterialCommunityIcons name="plus" size={24} color={colors.textSecondary} /></Pressable><Image accessibilityLabel="AKọ" source={require("@/assets/images/home-logo-dark.png")} style={s.logo} contentFit="contain" /><Pressable accessibilityLabel="Open notifications" onPress={() => router.push("/(tabs)/notifications")} style={s.icon}><MaterialCommunityIcons name="bell-outline" size={22} color={colors.textSecondary} />{unread > 0 && <View style={[s.badge, { backgroundColor: colors.danger }]}><Text style={s.badgeText}>{unread > 9 ? "9+" : unread}</Text></View>}</Pressable></View><View style={s.tabs}>{MODES.map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: mode === item.key }} onPress={() => setMode(item.key)} style={s.tab}><Text style={{ fontSize: 14, lineHeight: 19, fontWeight: "600", color: mode === item.key ? colors.accent : colors.textSecondary }}>{item.label}</Text>{mode === item.key && <View style={[s.indicator, { backgroundColor: colors.accent }]} />}</Pressable>)}</View></View>{feed.isLoading ? <FeedSkeleton /> : feed.isError && !posts.length ? <ErrorState message="Couldn't load your feed." onRetry={() => void feed.refetch()} /> : <FlatList data={posts} renderItem={render} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingTop: 14, paddingBottom: 28, flexGrow: posts.length ? undefined : 1 }} ItemSeparatorComponent={() => <View style={{ height: 14 }} />} refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={colors.accent} />} onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }} onEndReachedThreshold={.5} ListEmptyComponent={<EmptyState icon="post-outline" title="Nothing here yet" message={empty} />} ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ margin: 20 }} /> : null} initialNumToRender={5} maxToRenderPerBatch={6} windowSize={7} />}</View>;
}

const s = StyleSheet.create({ root: { flex: 1 }, header: { borderBottomWidth: 1 }, top: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 4 }, icon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" }, logo: { width: 71, height: 36 }, badge: { position: "absolute", right: 0, top: 0, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: "center", justifyContent: "center" }, badgeText: { color: "white", fontSize: 10, lineHeight: 12, fontWeight: "700" }, tabs: { height: 48, flexDirection: "row", paddingHorizontal: 16, paddingBottom: 4 }, tab: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative", paddingTop: 4, paddingBottom: 8 }, indicator: { position: "absolute", height: 4, borderRadius: 4, bottom: 0, left: 0, right: 0 } });
