import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { Chip, Screen, Text } from "@/components/core";
import { EmptyState, ErrorState } from "@/components/feedback";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { PostCard } from "@/components/feed/PostCard";
import { useFeed } from "@/features/feed/api";
import type { FeedMode, Post } from "@/features/feed/types";
import { useTheme } from "@/providers/ThemeProvider";

const MODES: { key: FeedMode; label: string }[] = [{ key: "ranked", label: "For you" }, { key: "following", label: "Following" }, { key: "top", label: "Top" }];

export default function HomeScreen() {
  const [mode, setMode] = useState<FeedMode>("ranked"); const feed = useFeed(mode); const { colors } = useTheme(); const posts = feed.data?.pages.flat() ?? [];
  const render = useCallback(({ item }: { item: Post }) => <PostCard post={item} />, []);
  const empty = mode === "following" ? "Follow people to build a feed around the voices you value." : mode === "top" ? "Top discussions will appear as the community engages." : "Your AKọ is quiet right now. Check back soon.";
  return <Screen scroll={false} contentStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}><View style={{ paddingHorizontal: 20 }}><ScreenHeader title="Home" subtitle="Reason together" /><View style={{ flexDirection: "row", gap: 8, paddingVertical: 10 }}>{MODES.map(item => <Chip key={item.key} label={item.label} selected={mode === item.key} onPress={() => setMode(item.key)} />)}</View></View>{feed.isLoading ? <FeedSkeleton /> : feed.isError && !posts.length ? <ErrorState message="Couldn't load your feed. Check your connection and try again." onRetry={() => void feed.refetch()} /> : <FlatList data={posts} renderItem={render} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 28, flexGrow: posts.length ? undefined : 1 }} refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={colors.accent} />} onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }} onEndReachedThreshold={0.5} ListEmptyComponent={<EmptyState icon="post-outline" title="Nothing here yet" message={empty} />} ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ margin: 20 }} /> : feed.isFetchNextPageError ? <View style={{ padding: 20 }}><Text color="danger" align="center" onPress={() => void feed.fetchNextPage()}>{"Couldn't load more. Tap to retry."}</Text></View> : null} removeClippedSubviews initialNumToRender={5} maxToRenderPerBatch={6} windowSize={7} />}</Screen>;
}
