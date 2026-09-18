import { Alert, Modal, Pressable, Share, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "@/components/core";
import { useBookmark, usePost, useReaction, useToggleBookmark, useToggleReaction } from "@/features/feed/api";
import { useTheme } from "@/providers/ThemeProvider";
import { useState } from "react";
import type { Stance } from "@/features/feed/types";
import { StanceComposer } from "./StanceComposer";
import { GiftPicker } from "./GiftPicker";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

function MainAction({ icon, label, active, onPress }: { icon: Icon; label?: string; active?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? icon} onPress={onPress} hitSlop={8} style={s.mainAction}><MaterialCommunityIcons name={icon} size={24} color={active ? "#D98978" : colors.text} />{label ? <Text style={[s.mainCount, { color: active ? "#D98978" : colors.text }]}>{label}</Text> : null}</Pressable>;
}

function SheetAction({ icon, label, active, onPress }: { icon: Icon; label: string; active?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.sheetAction}><MaterialCommunityIcons name={icon} size={25} color={active ? colors.accent : colors.text} /><Text color={active ? "accent" : "secondary"} style={s.sheetLabel}>{label}</Text></Pressable>;
}

export function PostActions({ postId, recipientId, recipientName, recipientAvatar, likes, dislikes, comments, shares, support, disagree, pushback, onComments, onReshare }: { postId: string; recipientId?: string; recipientName?: string; recipientAvatar?: string | null; likes: number; dislikes: number; comments: number; shares: number; support: number; disagree: number; pushback: number; onComments: () => void; onReshare: () => void }) {
  const { colors } = useTheme(); const [more, setMore] = useState(false); const [stance, setStance] = useState<Stance | null>(null); const [gift, setGift] = useState(false);
  const post = usePost(postId); const giftRecipientId = recipientId ?? post.data?.author.id; const giftRecipientName = recipientName ?? post.data?.author.display_name; const giftRecipientAvatar = recipientAvatar ?? post.data?.author.avatar_url ?? null;
  const like = useReaction(postId, "like"); const dislike = useReaction(postId, "dislike"); const bookmark = useBookmark(postId);
  const toggleLike = useToggleReaction(postId, "like"); const toggleDislike = useToggleReaction(postId, "dislike"); const toggleBookmark = useToggleBookmark(postId);
  const share = () => void Share.share({ message: `https://ako.app/post/${postId}` });
  const react = async (kind: "like" | "dislike") => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); try { if (kind === "like") { if (dislike.data) await toggleDislike.mutateAsync(true); await toggleLike.mutateAsync(!!like.data); } else { if (like.data) await toggleLike.mutateAsync(true); await toggleDislike.mutateAsync(!!dislike.data); } } catch { Alert.alert("Couldn't update reaction", "Check your connection and try again."); } };
  const saved = () => { void Haptics.selectionAsync(); void toggleBookmark.mutateAsync(!!bookmark.data).catch(() => Alert.alert("Couldn't update saved posts")); };
  const chooseStance = (value: Stance) => { setMore(false); setStance(value); };
  const chooseGift = () => { setMore(false); setGift(true); };
  const chooseReshare = () => { setMore(false); onReshare(); };
  return <><View style={s.actionBlock}><View style={s.row}><MainAction icon={like.data ? "heart" : "heart-outline"} label={likes ? String(likes) : undefined} active={!!like.data} onPress={() => void react("like")}/><MainAction icon="redo" onPress={share}/><MainAction icon="handshake-outline" label={support ? String(support) : undefined} onPress={() => chooseStance("support")}/><MainAction icon="gift-outline" onPress={chooseGift}/><MainAction icon="dots-horizontal" onPress={() => setMore(true)}/></View><Pressable onPress={onComments} hitSlop={7} style={s.comments}><Text color="secondary" style={s.commentsText}>Comments: {comments}</Text></Pressable></View><Modal visible={more} transparent animationType="fade" onRequestClose={() => setMore(false)}><Pressable style={[s.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setMore(false)}><Pressable onPress={() => undefined} style={[s.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={s.grid}><SheetAction icon="redo" label="Share" onPress={() => { setMore(false); share(); }}/><SheetAction icon="handshake-outline" label={support ? `Support (${support})` : "Support"} onPress={() => chooseStance("support")}/><SheetAction icon="gift-outline" label="Gift" onPress={chooseGift}/><SheetAction icon={bookmark.data ? "bookmark" : "bookmark-outline"} label={bookmark.data ? "Saved" : "Save"} active={!!bookmark.data} onPress={() => { setMore(false); saved(); }}/><SheetAction icon="emoticon-sad-outline" label={disagree ? `Disagree (${disagree})` : "Disagree"} onPress={() => chooseStance("disagree")}/><SheetAction icon="hand-back-right-outline" label={pushback ? `Pushback (${pushback})` : "Pushback"} onPress={() => chooseStance("pushback")}/><SheetAction icon={dislike.data ? "thumb-down" : "thumb-down-outline"} label={dislike.data ? "Disliked" : "Dislike"} active={!!dislike.data} onPress={() => { setMore(false); void react("dislike"); }}/><SheetAction icon="repeat" label={shares ? `Reshare (${shares})` : "Reshare"} onPress={chooseReshare}/></View><Pressable onPress={() => setMore(false)} style={[s.cancel, { borderTopColor: colors.border }]}><Text color="secondary" style={s.cancelText}>Cancel</Text></Pressable></Pressable></Pressable></Modal>{stance&&<StanceComposer postId={postId} initial={stance} onClose={() => setStance(null)}/>}{Boolean(gift&&giftRecipientId&&giftRecipientName)&&<GiftPicker recipientId={giftRecipientId!} recipientName={giftRecipientName!} recipientAvatar={giftRecipientAvatar} postId={postId} onClose={() => setGift(false)}/>}</>;
}

const s = StyleSheet.create({ actionBlock: { marginTop: 11 }, row: { height: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 3 }, mainAction: { minWidth: 39, height: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, mainCount: { fontSize: 13, fontWeight: "700" }, comments: { alignSelf: "flex-start", paddingTop: 5, paddingBottom: 1 }, commentsText: { fontSize: 11, lineHeight: 15 }, backdrop: { flex: 1, justifyContent: "flex-end" }, sheet: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" }, grid: { paddingHorizontal: 22, paddingTop: 19, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap" }, sheetAction: { width: "25%", minHeight: 71, alignItems: "center", justifyContent: "center", gap: 5 }, sheetLabel: { fontSize: 11, lineHeight: 15, textAlign: "center" }, cancel: { minHeight: 51, alignItems: "center", justifyContent: "center", borderTopWidth: StyleSheet.hairlineWidth }, cancelText: { fontSize: 14, fontWeight: "600" } });
