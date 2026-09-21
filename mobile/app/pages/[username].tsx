import { ActivityIndicator, Alert, FlatList, Pressable, Share, StyleSheet, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Text } from "@/components/core";
import { ErrorState, Skeleton } from "@/components/feedback";
import { PostCard } from "@/components/feed/PostCard";
import { useIdentityPosts, usePage, usePageFollow, useTogglePageFollow } from "@/features/discovery/api";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

const PAGE_TYPE_LABEL: Record<string, string> = {
  organization: "Organization",
  brand: "Brand",
  product: "Product",
};

export default function PageProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const page = usePage(typeof username === "string" ? username : "");
  const p = page.data;
  const follow = usePageFollow(p?.id ?? "");
  const toggle = useTogglePageFollow(p?.id ?? "");
  const posts = useIdentityPosts(p?.id ?? "", "page");

  if (page.isLoading) {
    return <SafeAreaView edges={["top", "left", "right"]} style={[s.root, { backgroundColor: colors.background }]}><View style={s.loading}><Skeleton height={154} /><Skeleton height={320} /></View></SafeAreaView>;
  }

  if (page.isError || !p) {
    return <SafeAreaView edges={["top", "left", "right"]} style={[s.root, { backgroundColor: colors.background }]}><ErrorState message="Page unavailable." onRetry={() => void page.refetch()} /></SafeAreaView>;
  }

  const postRows = posts.data?.pages.flat() ?? [];
  const isFollowing = !!follow.data;
  const followLabel = isFollowing ? "Following" : "Follow";
  const toggleFollow = () => {
    if (!user) {
      Alert.alert("Sign in required", "Sign in to follow this page.");
      return;
    }
    void toggle.mutateAsync(isFollowing).catch(() => Alert.alert("Couldn't update page follow"));
  };
  const sharePage = () => void Share.share({ message: `https://ako.app/page/${p.username}` });

  const header = <PageHeader
    name={p.name}
    username={p.username}
    avatar={p.avatar_url}
    tagline={p.tagline}
    bio={p.bio}
    pageType={PAGE_TYPE_LABEL[p.page_type] ?? p.page_type}
    followers={p.follower_count}
    verified={p.is_verified}
    following={isFollowing}
    followLabel={followLabel}
    followPending={follow.isLoading || toggle.isPending}
    onBack={() => router.back()}
    onFollow={toggleFollow}
    onShare={sharePage}
  />;

  return <SafeAreaView edges={["top", "left", "right"]} style={[s.root, { backgroundColor: colors.background }]}>
    <FlatList
      data={postRows}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <View style={s.postWrap}><PostCard post={item} /></View>}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      contentContainerStyle={s.list}
      refreshing={page.isRefetching || posts.isRefetching}
      onRefresh={() => {
        void page.refetch();
        void posts.refetch();
      }}
      onEndReached={() => {
        if (posts.hasNextPage && !posts.isFetchingNextPage) void posts.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={posts.isLoading ? <ActivityIndicator color={colors.accent} style={s.indicator} /> : <Text color="muted" align="center" style={s.empty}>{p.name} hasn&apos;t posted anything yet.</Text>}
      ListFooterComponent={posts.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={s.indicator} /> : <View style={{ height: 24 }} />}
    />
  </SafeAreaView>;
}

function PageHeader({ name, username, avatar, tagline, bio, pageType, followers, verified, following, followLabel, followPending, onBack, onFollow, onShare }: {
  name: string;
  username: string;
  avatar: string | null;
  tagline: string | null;
  bio: string | null;
  pageType: string;
  followers: number;
  verified: boolean;
  following: boolean;
  followLabel: string;
  followPending: boolean;
  onBack: () => void;
  onFollow: () => void;
  onShare: () => void;
}) {
  const { colors } = useTheme();

  return <View>
    <View style={s.toolbar}>
      <Pressable accessibilityLabel="Go back" onPress={onBack} hitSlop={10} style={s.back}>
        <Feather name="arrow-left" size={23} color={colors.textSecondary} />
      </Pressable>
      <Pressable accessibilityLabel={`Share ${name}`} onPress={onShare} hitSlop={10} style={s.share}>
        <Feather name="more-horizontal" size={21} color={colors.textSecondary} />
      </Pressable>
    </View>

    <View style={s.identity}>
      <Avatar uri={avatar} name={name} size={72} />
      <View style={s.identityCopy}>
        <View style={s.nameRow}>
          <Text numberOfLines={1} style={s.name}>{name}</Text>
          {verified ? <MaterialCommunityIcons name="check-decagram" size={18} color={colors.accent} /> : null}
        </View>
        <Text color="secondary" numberOfLines={1} style={s.meta}>{pageType} Â· @{username}</Text>
        {tagline ? <Text numberOfLines={2} style={s.tagline}>{tagline}</Text> : null}
      </View>
    </View>

    {bio ? <Text style={s.bio}>{bio}</Text> : null}

    <View style={s.stats}>
      <Text style={s.statNumber}>{followers.toLocaleString()} <Text color="secondary" style={s.statLabel}>{followers === 1 ? "follower" : "followers"}</Text></Text>
    </View>

    <Pressable disabled={followPending} onPress={onFollow} style={({ pressed }) => [s.followButton, { backgroundColor: following ? colors.accentSoft : colors.accent, opacity: followPending ? 0.55 : pressed ? 0.75 : 1 }]}>
      {followPending ? <ActivityIndicator color={following ? colors.accent : colors.onAccent} /> : <Text style={[s.followText, { color: following ? colors.accent : colors.onAccent }]}>{followLabel}</Text>}
    </Pressable>

    <View style={[s.tabs, { borderBottomColor: colors.border }]}>
      <View style={s.tab}>
        <Text style={[s.tabText, { color: colors.accent }]}>Posts</Text>
        <View style={[s.tabLine, { backgroundColor: colors.accent }]} />
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { padding: 18, gap: 16 },
  list: { paddingBottom: 36, maxWidth: 720, width: "100%", alignSelf: "center" },
  postWrap: { paddingHorizontal: 18 },
  toolbar: { height: 54, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 42, height: 42, alignItems: "flex-start", justifyContent: "center" },
  share: { width: 42, height: 42, alignItems: "flex-end", justifyContent: "center" },
  identity: { paddingHorizontal: 18, paddingTop: 20, flexDirection: "row", alignItems: "flex-start", gap: 18 },
  identityCopy: { flex: 1, minWidth: 0, paddingTop: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  meta: { marginTop: 2, fontSize: 14, lineHeight: 19 },
  tagline: { marginTop: 7, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  bio: { paddingHorizontal: 18, marginTop: 16, fontSize: 15, lineHeight: 22 },
  stats: { paddingHorizontal: 18, marginTop: 28, flexDirection: "row" },
  statNumber: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
  statLabel: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  followButton: { height: 46, marginHorizontal: 18, marginTop: 18, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  followText: { fontSize: 16, lineHeight: 21, fontWeight: "800" },
  tabs: { height: 66, paddingTop: 8, marginTop: 28, marginBottom: 18, flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabText: { fontSize: 16, lineHeight: 21, fontWeight: "800" },
  tabLine: { position: "absolute", left: 18, right: 18, bottom: -1, height: 2, borderRadius: 2 },
  indicator: { marginVertical: 34 },
  empty: { paddingHorizontal: 28, paddingVertical: 48, fontSize: 14, lineHeight: 20 },
});
