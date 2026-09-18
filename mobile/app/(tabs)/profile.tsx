import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar, Text } from "@/components/core";
import { PostCard } from "@/components/feed/PostCard";
import { ErrorState, Skeleton } from "@/components/feedback";
import { useIdentityPosts, useProfile, useProfileMedia } from "@/features/discovery/api";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

type Tab = "posts" | "media";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile: activeProfile, user } = useAuth();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>("posts");
  const profileQuery = useProfile(activeProfile?.username ?? "");
  const person = profileQuery.data;
  const posts = useIdentityPosts(person?.id ?? user?.id ?? "", "profile");
  const media = useProfileMedia(person?.id ?? user?.id ?? "");
  const postRows = useMemo(() => posts.data?.pages.flat() ?? [], [posts.data]);

  const openMenu = () => Alert.alert("Profile", undefined, [
    { text: "Edit profile", onPress: () => router.push("/profile/edit") },
    { text: "Account mode", onPress: () => router.push("/pages/index") },
    { text: "Sign out", style: "destructive", onPress: () => router.push("/modals/logout-confirm") },
    { text: "Cancel", style: "cancel" },
  ]);
  const refresh = () => { void profileQuery.refetch(); if (tab === "posts") void posts.refetch(); else void media.refetch(); };

  if (profileQuery.isLoading) return <View style={[s.root, s.loading, { backgroundColor: colors.background }]}><Skeleton height={170}/><Skeleton height={310}/></View>;
  if (profileQuery.isError || !person) return <View style={[s.root, { backgroundColor: colors.background }]}><ErrorState message="Couldn't load your profile." onRetry={() => void profileQuery.refetch()}/></View>;

  const header = <ProfileHeader person={person} tab={tab} onTab={setTab} onMenu={openMenu} onCreate={() => router.push("/modals/create")}/>;
  if (tab === "media") return <FlatList style={[s.root, { backgroundColor: colors.background }]} data={media.data ?? []} keyExtractor={item => item.id} ListHeaderComponent={header} contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={media.isRefetching} onRefresh={refresh} tintColor={colors.accent}/>} ListEmptyComponent={media.isLoading ? <ActivityIndicator color={colors.accent} style={s.indicator}/> : <Text color="muted" align="center" style={s.empty}>No media yet.</Text>} renderItem={({ item }) => <MediaRow item={item.id} title={item.title} description={item.description} price={item.promo_price_usd ?? item.price_usd}/>}/>;
  return <FlatList style={[s.root, { backgroundColor: colors.background }]} data={postRows} keyExtractor={item => item.id} ListHeaderComponent={header} contentContainerStyle={s.list} ItemSeparatorComponent={() => <View style={{ height: 12 }}/>} refreshControl={<RefreshControl refreshing={posts.isRefetching} onRefresh={refresh} tintColor={colors.accent}/>} onEndReached={() => { if (posts.hasNextPage && !posts.isFetchingNextPage) void posts.fetchNextPage(); }} onEndReachedThreshold={.45} ListEmptyComponent={posts.isLoading ? <ActivityIndicator color={colors.accent} style={s.indicator}/> : <Text color="muted" align="center" style={s.empty}>Share your first post.</Text>} ListFooterComponent={posts.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={s.indicator}/> : <View style={{ height: 16 }}/>} renderItem={({ item }) => <PostCard post={item}/>}/>;
}

function ProfileHeader({ person, tab, onTab, onCreate, onMenu }: { person: { username: string; display_name: string; avatar_url: string | null; bio: string | null; following_count: number; follower_count: number; is_verified: boolean }; tab: Tab; onTab: (tab: Tab) => void; onCreate: () => void; onMenu: () => void }) {
  const router = useRouter(); const { colors } = useTheme();
  return <><View style={s.actions}><View style={{ flex: 1 }}/><Pressable accessibilityLabel="Create" onPress={onCreate} style={s.action}><MaterialCommunityIcons name="plus" size={25} color={colors.textSecondary}/></Pressable><Pressable accessibilityLabel="Profile options" onPress={onMenu} style={s.action}><MaterialCommunityIcons name="dots-horizontal" size={23} color={colors.textSecondary}/></Pressable></View><View style={s.identity}><Avatar uri={person.avatar_url} name={person.display_name} size={76}/><View style={s.copy}><View style={s.nameRow}><Text style={s.name}>{person.display_name}</Text>{person.is_verified&&<MaterialCommunityIcons name="check-decagram" size={17} color={colors.accent}/>}</View><Text color="secondary" style={s.handle}>@{person.username}</Text>{person.bio&&<Text color="secondary" numberOfLines={3} style={s.bio}>{person.bio}</Text>}</View></View><View style={s.stats}><Pressable onPress={() => router.push({ pathname: "/profiles/[username]/[list]", params: { username: person.username, list: "following" } })}><Text style={s.stat}>{person.following_count} <Text color="secondary" style={s.statLabel}>Following</Text></Text></Pressable><Pressable onPress={() => router.push({ pathname: "/profiles/[username]/[list]", params: { username: person.username, list: "followers" } })}><Text style={s.stat}>{person.follower_count} <Text color="secondary" style={s.statLabel}>Followers</Text></Text></Pressable></View><View style={[s.tabs, { borderBottomColor: colors.border }]}>{(["posts", "media"] as Tab[]).map(value => <Pressable key={value} onPress={() => onTab(value)} style={s.tab}><Text style={[s.tabText, { color: tab === value ? colors.accent : colors.textMuted }]}>{value === "posts" ? "Posts" : "Media"}</Text>{tab === value&&<View style={[s.tabLine, { backgroundColor: colors.accent }]}/>}</Pressable>)}</View></>;
}

function MediaRow({ item, title, description, price }: { item: string; title: string; description: string | null; price: number }) { const { colors } = useTheme(); return <Pressable onPress={() => Alert.alert(title, "Opening this media is not available in the mobile app yet.")} style={[s.media, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialCommunityIcons name="play-circle-outline" size={31} color={colors.accent}/><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.mediaTitle}>{title}</Text><Text color="secondary" numberOfLines={1} style={s.mediaDescription}>{description || "Media"}</Text></View><Text color="accent" style={s.price}>{price > 0 ? `$${price.toFixed(2)}` : "Free"}</Text></Pressable>; }

const s = StyleSheet.create({ root: { flex: 1 }, loading: { padding: 18, gap: 16 }, list: { paddingBottom: 18 }, actions: { height: 48, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 5 }, action: { width: 40, height: 40, alignItems: "center", justifyContent: "center" }, identity: { paddingHorizontal: 18, paddingTop: 17, flexDirection: "row", gap: 16, alignItems: "flex-start" }, copy: { flex: 1, minWidth: 0, paddingTop: 5 }, nameRow: { flexDirection: "row", alignItems: "center", gap: 6 }, name: { flexShrink: 1, fontSize: 20, lineHeight: 26, fontWeight: "800" }, handle: { fontSize: 14, lineHeight: 19, marginTop: 1 }, bio: { fontSize: 14, lineHeight: 20, marginTop: 8 }, stats: { paddingHorizontal: 18, paddingTop: 17, paddingBottom: 17, flexDirection: "row", gap: 21 }, stat: { fontSize: 14, lineHeight: 19, fontWeight: "800" }, statLabel: { fontWeight: "400" }, tabs: { height: 48, marginHorizontal: 18, flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth }, tab: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" }, tabText: { fontSize: 14, lineHeight: 19, fontWeight: "700" }, tabLine: { position: "absolute", left: 0, right: 0, bottom: -1, height: 2, borderRadius: 2 }, indicator: { marginVertical: 36 }, empty: { paddingVertical: 50 }, media: { minHeight: 80, marginHorizontal: 18, marginBottom: 12, borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 }, mediaTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" }, mediaDescription: { fontSize: 12, lineHeight: 17, marginTop: 3 }, price: { fontSize: 12, fontWeight: "700" } });
