import { memo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar, Badge, Card, Text } from "@/components/core";
import type { Post } from "@/features/feed/types";
import { isPlainReshare, isQuote } from "@/features/feed/types";
import { PostText } from "./PostText";
import { PostMedia } from "./PostMedia";
import { PostActions } from "./PostActions";
import { ReshareSheet } from "./ReshareSheet";

const time = (iso: string) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return minutes < 1 ? "now" : minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const PostCard = memo(function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const [reshare, setReshare] = useState(false);
  const plain = isPlainReshare(post);
  const display = plain && post.reshared_post ? post.reshared_post : post;
  const identity = ("posted_as_page" in display ? display.posted_as_page : null) ?? display.author;
  const name = "name" in identity ? identity.name : identity.display_name;
  const open = () => router.push({ pathname: "/posts/[postId]", params: { postId: display.id } });
  const openIdentity = () => "name" in identity
    ? router.push({ pathname: "/pages/[username]", params: { username: identity.username } })
    : router.push({ pathname: "/profiles/[username]", params: { username: identity.username } });

  return <>
    <Card style={{ borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, gap: 12 }}>
      {plain && <Text variant="caption" color="secondary">{post.author.display_name} reshared</Text>}
      <Pressable onPress={openIdentity} accessibilityRole="button" accessibilityLabel={`Open ${name}'s profile`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <Avatar uri={identity.avatar_url} name={name} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <Text variant="label" numberOfLines={1}>{name}</Text>
              {identity.is_verified && <Badge label="Verified" />}
            </View>
            <Text variant="caption" color="secondary">@{identity.username} · {time(display.created_at)}{display.visibility === "followers_only" ? " · Followers" : ""}</Text>
          </View>
        </View>
      </Pressable>
      {isQuote(post) && <PostText heading={post.heading} content={post.content} />}
      {isQuote(post) && post.reshared_post ? <Card style={{ gap: 10 }}>
        <Text variant="caption" color="secondary">@{post.reshared_post.author.username}</Text>
        <PostText heading={post.reshared_post.heading} content={post.reshared_post.content} />
        <PostMedia urls={post.reshared_post.media_urls ?? []} />
      </Card> : <>
        <PostText heading={display.heading} content={display.content} />
        <PostMedia urls={display.media_urls ?? []} />
      </>}
      <PostActions postId={display.id} likes={display.like_count} dislikes={display.dislike_count} comments={display.comment_count} shares={display.share_count} onComments={open} onReshare={() => setReshare(true)} />
    </Card>
    <ReshareSheet postId={display.id} visible={reshare} onClose={() => setReshare(false)} />
  </>;
});
