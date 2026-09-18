import { memo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar, Badge, PressableScale, Text } from "@/components/core";
import type { Author, PageAuthor, Post } from "@/features/feed/types";
import { isPlainReshare, isQuote } from "@/features/feed/types";
import { PostText } from "./PostText";
import { PostMedia } from "./PostMedia";
import { PostActions } from "./PostActions";
import { ReshareSheet } from "./ReshareSheet";
import { CommentSheet } from "./CommentSheet";
import { useTheme } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useFollowState } from "@/features/discovery/api";

const time = (iso: string) => { const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); return minutes < 1 ? "now" : minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`; };

function IdentityLine({ identity, author, createdAt, editedAt, onPress }: { identity: Author | PageAuthor; author: Author; createdAt: string; editedAt?: string | null; onPress: () => void }) {
  const { colors } = useTheme(); const name = "name" in identity ? identity.name : identity.display_name; const roles = author.roles.map(role => role.label).join(" · ");
  return <PressableScale accessibilityRole="button" accessibilityLabel={`Open ${name}'s profile`} onPress={onPress} style={s.author}><Avatar uri={identity.avatar_url} name={name} size={44} /><View style={s.details}><View style={s.nameRow}><Text numberOfLines={1} style={s.name}>{name}</Text>{identity.is_verified && <Badge label="✓" />}</View>{roles ? <Text numberOfLines={1} style={[s.roles, { color: colors.textSecondary }]}>{roles}</Text> : null}<View style={s.timeRow}><Text variant="caption" color="secondary">{time(createdAt)}{editedAt ? " · edited" : ""}</Text><MaterialCommunityIcons name="web" size={11} color={colors.textSecondary} /></View></View></PressableScale>;
}

function EmbeddedPost({ post, onOpen }: { post: NonNullable<Post["reshared_post"]>; onOpen: () => void }) {
  const { colors } = useTheme();
  return <PressableScale onPress={onOpen} style={[s.embed, { borderColor: colors.border }]}><View style={s.embedHeader}><Avatar uri={post.author.avatar_url} name={post.author.display_name} size={32} /><View style={{ flex: 1 }}><Text variant="label" numberOfLines={1}>{post.author.display_name}</Text><Text variant="caption" color="secondary">@{post.author.username} · {time(post.created_at)}</Text></View></View><PostText heading={post.heading} content={post.content} /><PostMedia urls={post.media_urls ?? []} compact /></PressableScale>;
}

export const PostCard = memo(function PostCard({ post }: { post: Post }) {
  const router = useRouter(); const { colors } = useTheme(); const { user } = useAuth(); const relationship = useFollowState(post.author.id); const [reshare, setReshare] = useState(false); const [comments, setComments] = useState(false);
  const plain = isPlainReshare(post); const quote = isQuote(post); const identity = post.posted_as_page ?? post.author; const isOwnPost = user?.id === post.author.id;
  const relationshipLabel = !isOwnPost && !post.posted_as_page && (relationship.data?.following ? (relationship.data.followedBy ? "Friends" : "Following") : null);
  const open = () => router.push({ pathname: "/posts/[postId]", params: { postId: post.id } }); const openSource = () => post.reshared_post && router.push({ pathname: "/posts/[postId]", params: { postId: post.reshared_post.id } }); const openIdentity = () => "name" in identity ? router.push({ pathname: "/pages/[username]", params: { username: identity.username } }) : router.push({ pathname: "/profiles/[username]", params: { username: identity.username } });
  return <><View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={s.header}><IdentityLine identity={identity} author={post.author} createdAt={post.created_at} editedAt={post.edited_at} onPress={openIdentity} />{plain && <View style={[s.repeat, { backgroundColor: colors.accentSoft }]}><MaterialCommunityIcons name="repeat" size={14} color={colors.accent} /></View>}{relationshipLabel && <View style={[s.relationship, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}><Text variant="caption">{relationshipLabel}</Text></View>}</View>{quote && <PostText heading={post.heading} content={post.content} />}{(plain || quote) && post.reshared_post ? <EmbeddedPost post={post.reshared_post} onOpen={openSource} /> : <><Pressable onPress={open}><PostText heading={post.heading} content={post.content} /></Pressable><PostMedia urls={post.media_urls ?? []} /></>}<PostActions postId={post.id} recipientId={post.author.id} recipientName={post.author.display_name} recipientAvatar={post.author.avatar_url} likes={post.like_count} dislikes={post.dislike_count} comments={post.comment_count} shares={post.share_count} support={post.support_count} disagree={post.disagree_count} pushback={post.pushback_count} onComments={() => setComments(true)} onReshare={() => setReshare(true)} /></View><ReshareSheet postId={post.id} visible={reshare} onClose={() => setReshare(false)} />{comments && <CommentSheet postId={post.id} count={post.comment_count} onClose={() => setComments(false)} />}</>;
});

const s = StyleSheet.create({ card: { marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 15, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16 }, header: { position: "relative", minHeight: 46 }, author: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingRight: 82 }, details: { flex: 1, gap: 1 }, nameRow: { flexDirection: "row", alignItems: "center", gap: 5 }, name: { fontSize: 15, lineHeight: 20, fontWeight: "700", flexShrink: 1 }, roles: { fontSize: 12, lineHeight: 16 }, timeRow: { flexDirection: "row", alignItems: "center", gap: 5 }, relationship: { position: "absolute", right: 0, top: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }, repeat: { position: "absolute", right: 53, top: 11, padding: 5, borderRadius: 999 }, embed: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 13, padding: 11, gap: 9, overflow: "hidden" }, embedHeader: { flexDirection: "row", alignItems: "center", gap: 8 } });
