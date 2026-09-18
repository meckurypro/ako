import { memo, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, type SharedValue, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { EmptyState, ErrorState } from "@/components/feedback";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { PostCard } from "@/components/feed/PostCard";
import { useFeedChrome } from "@/components/navigation/FeedChrome";
import { useFeed } from "@/features/feed/api";
import type { FeedMode, Post } from "@/features/feed/types";
import { useTheme } from "@/providers/ThemeProvider";

const MODES: FeedMode[] = ["ranked", "top", "following"];
const COMMIT_RATIO = .33; const COMMIT_VELOCITY = 800; const EDGE_RESISTANCE = 2.5;

type Props = { index: number; onIndexChange: (index: number) => void; progress: SharedValue<number> };

const FeedPane = memo(function FeedPane({ mode }: { mode: FeedMode }) {
  const feed = useFeed(mode); const { colors } = useTheme(); const { scrollHandler } = useFeedChrome();
  const posts = feed.data?.pages.flat() ?? []; const render = useCallback(({ item }: { item: Post }) => <PostCard post={item} />, []);
  const empty = mode === "following" ? "No posts from people you follow yet. Follow a few people to see their posts here." : mode === "top" ? "Nothing's picked up much discussion in the last week yet." : "No posts yet. Be the first to share a thought.";
  if (feed.isLoading && !posts.length) return <FeedSkeleton />;
  if (feed.isError && !posts.length) return <ErrorState message="Couldn't load your feed." onRetry={() => void feed.refetch()} />;
  return <Animated.FlatList data={posts} renderItem={render} keyExtractor={item => item.id} contentContainerStyle={s.list} ItemSeparatorComponent={Separator} onScroll={scrollHandler} scrollEventThrottle={16} refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={colors.accent} />} onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }} onEndReachedThreshold={.5} ListEmptyComponent={<EmptyState icon="post-outline" title="Nothing here yet" message={empty} />} ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={s.loading} /> : <View style={s.footer} />} initialNumToRender={5} maxToRenderPerBatch={6} windowSize={7} />;
});
const Separator = () => <View style={s.separator} />;

export function FeedPager({ index, onIndexChange, progress }: Props) {
  const { width } = useWindowDimensions(); const translateX = useSharedValue(-index * width); const indexValue = useSharedValue(index); const requestedPane = useSharedValue(-1); const [visited, setVisited] = useState<Set<number>>(() => new Set([0, 1]));
  const ensureVisited = useCallback((next: number) => setVisited(current => current.has(next) ? current : new Set([...current, next])), []);
  useEffect(() => { indexValue.value = index; translateX.value = withSpring(-index * width, { damping: 20, stiffness: 220 }); progress.value = withSpring(index, { damping: 20, stiffness: 220 }); }, [index, indexValue, progress, translateX, width]);
  const settle = useCallback((next: number) => { ensureVisited(next); onIndexChange(next); }, [ensureVisited, onIndexChange]);
  const pan = Gesture.Pan().activeOffsetX([-6, 6]).failOffsetY([-6, 6]).onBegin(() => { requestedPane.value = -1; }).onUpdate(event => { const current = indexValue.value; let drag = event.translationX; if ((current === 0 && drag > 0) || (current === 2 && drag < 0)) drag /= EDGE_RESISTANCE; const position = current - drag / width; progress.value = Math.max(0, Math.min(2, position)); translateX.value = -progress.value * width; const neighbor = drag < -6 ? Math.min(2, current + 1) : drag > 6 ? Math.max(0, current - 1) : current; if (neighbor !== current && requestedPane.value !== neighbor) { requestedPane.value = neighbor; runOnJS(ensureVisited)(neighbor); } }).onEnd(event => { const current = indexValue.value; const ratio = event.translationX / width; let next = current; if (ratio <= -COMMIT_RATIO || event.velocityX <= -COMMIT_VELOCITY) next = Math.min(2, current + 1); else if (ratio >= COMMIT_RATIO || event.velocityX >= COMMIT_VELOCITY) next = Math.max(0, current - 1); translateX.value = withSpring(-next * width, { damping: 20, stiffness: 220 }); progress.value = withSpring(next, { damping: 20, stiffness: 220 }); if (next !== current) runOnJS(settle)(next); });
  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  return <GestureDetector gesture={pan}><Animated.View style={[s.track, { width: width * 3 }, trackStyle]}>{MODES.map((mode, pane) => <View key={mode} style={{ width }}>{visited.has(pane) ? <FeedPane mode={mode} /> : <View style={{ flex: 1 }} />}</View>)}</Animated.View></GestureDetector>;
}

const s = StyleSheet.create({ track: { flex: 1, flexDirection: "row" }, list: { paddingTop: 12, paddingBottom: 28, flexGrow: 1 }, separator: { height: 10 }, loading: { margin: 20 }, footer: { height: 12 } });
