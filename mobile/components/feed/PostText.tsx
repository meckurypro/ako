import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/core";

const PARTS = /(#\p{L}[\p{L}\p{N}_]*)/gu;

export function PostText({ heading, content }: { heading?: string | null; content: string }) {
  const [expanded, setExpanded] = useState(false); const router = useRouter(); const parts = content.split(PARTS);
  return <View style={{ gap: 7 }}>{heading && <Text variant="heading">{heading}</Text>}<Text numberOfLines={expanded ? undefined : 6} style={{ fontSize: 15, lineHeight: 22 }}>{parts.map((part, index) => part.startsWith("#") ? <Text key={`${part}-${index}`} color="accent" onPress={() => router.push({ pathname: "/discover/search", params: { q: part.slice(1) } })}>{part}</Text> : part)}</Text>{content.length > 280 && <Pressable accessibilityRole="button" onPress={() => setExpanded(value => !value)} hitSlop={6}><Text variant="label" color="accent">{expanded ? "Show less" : "Show more"}</Text></Pressable>}</View>;
}
