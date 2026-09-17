import { ActionSheetIOS, Alert, Platform, Share, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale, Text } from "@/components/core";
import { useBookmark, useReaction, useToggleBookmark, useToggleReaction } from "@/features/feed/api";
import { useTheme } from "@/providers/ThemeProvider";

function Action({ icon, label, active, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; active?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={styles.action}><MaterialCommunityIcons name={icon} size={21} color={active ? colors.accent : colors.textSecondary} /><Text variant="caption" color={active ? "accent" : "secondary"}>{label}</Text></PressableScale>;
}

export function PostActions({ postId, likes, dislikes, comments, shares, onComments, onReshare }: { postId: string; likes: number; dislikes: number; comments: number; shares: number; onComments: () => void; onReshare: () => void }) {
  const like = useReaction(postId, "like"); const dislike = useReaction(postId, "dislike");
  const toggleLike = useToggleReaction(postId, "like"); const toggleDislike = useToggleReaction(postId, "dislike");
  const bookmark = useBookmark(postId); const toggleBookmark = useToggleBookmark(postId);
  const toggleSaved = () => { void Haptics.selectionAsync(); void toggleBookmark.mutateAsync(!!bookmark.data).catch(() => Alert.alert("Couldn't update bookmark")); };
  const share = () => void Share.share({ message: `ako://posts/${postId}` });
  const menu = () => {
    const options = [bookmark.data ? "Remove bookmark" : "Bookmark", "Share", "Cancel"];
    const select = (index: number) => { if (index === 0) toggleSaved(); if (index === 1) share(); };
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, select);
    else Alert.alert("Post actions", undefined, [{ text: options[0], onPress: toggleSaved }, { text: "Share", onPress: share }, { text: "Cancel", style: "cancel" }]);
  };
  const act = async (kind: "like" | "dislike") => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (kind === "like") { if (dislike.data) await toggleDislike.mutateAsync(true); await toggleLike.mutateAsync(!!like.data); }
      else { if (like.data) await toggleLike.mutateAsync(true); await toggleDislike.mutateAsync(!!dislike.data); }
    } catch { Alert.alert("Couldn't update reaction", "Check your connection and try again."); }
  };
  return <View style={styles.row}><Action icon={like.data ? "heart" : "heart-outline"} label={String(likes)} active={like.data} onPress={() => void act("like")} /><Action icon="thumb-down-outline" label={String(dislikes)} active={dislike.data} onPress={() => void act("dislike")} /><Action icon="comment-outline" label={String(comments)} onPress={onComments} /><Action icon="repeat" label={String(shares)} onPress={onReshare} /><Action icon="share-variant-outline" label="Share" onPress={share} /><Action icon="dots-horizontal" label="More" onPress={menu} /></View>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }, action: { minWidth: 42, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 2 } });
