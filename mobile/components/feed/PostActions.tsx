import { Alert, Modal, Pressable, Share, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale, Text } from "@/components/core";
import { useBookmark, useEngagementOrder, usePost, useReaction, useToggleBookmark, useToggleReaction, type SecondaryActionKey } from "@/features/feed/api";
import { useTheme } from "@/providers/ThemeProvider";
import { useState } from "react";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from "react-native-reanimated";
import type { Stance } from "@/features/feed/types";
import { StanceComposer } from "./StanceComposer";
import { GiftPicker } from "./GiftPicker";
import { LikeHeart } from "./LikeHeart";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

function MainAction({ icon, label, active, onPress }: { icon: Icon; label?: string; active?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <PressableScale accessibilityRole="button" accessibilityLabel={label ?? icon} onPress={onPress} hitSlop={8} style={s.mainAction}>{icon === "heart" || icon === "heart-outline" ? <LikeHeart active={!!active} color="#D98978" /> : <MaterialCommunityIcons name={icon} size={24} color={active ? "#D98978" : colors.text} />}{label ? <Text style={[s.mainCount, { color: active ? "#D98978" : colors.text }]}>{label}</Text> : null}</PressableScale>;
}

function SheetAction({ icon, label, active, onPress }: { icon: Icon; label: string; active?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.sheetAction}><MaterialCommunityIcons name={icon} size={25} color={active ? colors.accent : colors.text} /><Text color={active ? "accent" : "secondary"} style={s.sheetLabel}>{label}</Text></PressableScale>;
}

function ActionSheet({ children, colors, onClose }: { children: React.ReactNode; colors: ReturnType<typeof useTheme>["colors"]; onClose: () => void }) {
  const reduced = useReducedMotion();
  return <Modal visible transparent animationType="none" onRequestClose={onClose}><View style={s.modal}><Animated.View entering={reduced ? undefined : FadeIn.duration(140)} exiting={reduced ? undefined : FadeOut.duration(110)} style={[s.backdrop, { backgroundColor: colors.overlay }]}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /></Animated.View><Animated.View entering={reduced ? undefined : SlideInDown.duration(220)} exiting={reduced ? undefined : SlideOutDown.duration(180)} style={[s.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</Animated.View></View></Modal>;
}

export function PostActions({ postId, recipientId, recipientName, recipientAvatar, likes, dislikes: _dislikes, comments, shares, support, disagree, pushback, onComments, onReshare }: { postId: string; recipientId?: string; recipientName?: string; recipientAvatar?: string | null; likes: number; dislikes: number; comments: number; shares: number; support: number; disagree: number; pushback: number; onComments: () => void; onReshare: () => void }) {
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
  const engagement = useEngagementOrder(); const order = engagement.data ?? ["support", "reshare", "share", "gift", "save", "disagree", "pushback", "dislike"] as SecondaryActionKey[];
  const middle = order.slice(0, 3); const action = (key: SecondaryActionKey) => key === "support" ? { icon: "handshake-outline" as Icon, label: support ? String(support) : undefined, onPress: () => chooseStance("support") } : key === "reshare" ? { icon: "repeat" as Icon, label: shares ? String(shares) : undefined, onPress: chooseReshare } : key === "share" ? { icon: "redo" as Icon, label: undefined, onPress: share } : key === "gift" ? { icon: "gift-outline" as Icon, label: undefined, onPress: chooseGift } : key === "save" ? { icon: bookmark.data ? "bookmark" as Icon : "bookmark-outline" as Icon, label: undefined, onPress: saved } : key === "disagree" ? { icon: "emoticon-sad-outline" as Icon, label: disagree ? String(disagree) : undefined, onPress: () => chooseStance("disagree") } : key === "pushback" ? { icon: "hand-back-right-outline" as Icon, label: pushback ? String(pushback) : undefined, onPress: () => chooseStance("pushback") } : { icon: dislike.data ? "thumb-down" as Icon : "thumb-down-outline" as Icon, label: _dislikes ? String(_dislikes) : undefined, onPress: () => void react("dislike") };
  return <><View style={s.actionBlock}><View style={s.row}><MainAction icon={like.data ? "heart" : "heart-outline"} label={likes ? String(likes) : undefined} active={!!like.data} onPress={() => void react("like")}/>{middle.map(key=>{const item=action(key);return <MainAction key={key} icon={item.icon} label={item.label} onPress={item.onPress}/>})}<MainAction icon="dots-horizontal" onPress={() => setMore(true)}/></View><Pressable onPress={onComments} hitSlop={7} style={s.comments}><Text color="secondary" style={s.commentsText}>Comments: {comments}</Text></Pressable></View>{more && <ActionSheet colors={colors} onClose={() => setMore(false)}><View style={s.grid}>{order.map(key=>{const item=action(key);const count=item.label?` (${item.label})`:"";return <SheetAction key={key} icon={item.icon} label={`${key[0].toUpperCase()+key.slice(1)}${count}`} onPress={()=>{setMore(false);item.onPress()}}/>})}</View><Pressable onPress={() => setMore(false)} style={[s.cancel, { borderTopColor: colors.border }]}><Text color="secondary" style={s.cancelText}>Cancel</Text></Pressable></ActionSheet>}{stance&&<StanceComposer postId={postId} initial={stance} onClose={() => setStance(null)}/>}{Boolean(gift&&giftRecipientId&&giftRecipientName)&&<GiftPicker recipientId={giftRecipientId!} recipientName={giftRecipientName!} recipientAvatar={giftRecipientAvatar} postId={postId} onClose={() => setGift(false)}/>}</>;
}

const s = StyleSheet.create({ actionBlock: { marginTop: 4 }, row: { height: 38, flexDirection: "row", alignItems: "center" }, mainAction: { width: "20%", height: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, mainCount: { fontSize: 13, fontWeight: "700" }, comments: { width: "20%", paddingTop: 8, paddingBottom: 1 }, commentsText: { fontSize: 11, lineHeight: 15 }, modal: { flex: 1, justifyContent: "flex-end" }, backdrop: { ...StyleSheet.absoluteFill }, sheet: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" }, grid: { paddingHorizontal: 22, paddingTop: 19, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap" }, sheetAction: { width: "25%", minHeight: 71, alignItems: "center", justifyContent: "center", gap: 5 }, sheetLabel: { fontSize: 11, lineHeight: 15, textAlign: "center" }, cancel: { minHeight: 51, alignItems: "center", justifyContent: "center", borderTopWidth: StyleSheet.hairlineWidth }, cancelText: { fontSize: 14, fontWeight: "600" } });
