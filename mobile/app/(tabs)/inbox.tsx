import { View } from "react-native";
import { Avatar, Card, Screen, Section } from "@/components/core";
import { EmptyState, Skeleton } from "@/components/feedback";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
export default function InboxScreen() { return <Screen><ScreenHeader title="Inbox" subtitle="Messages and collaboration" /><Section title="Messages"><Card style={{ gap: 16 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Avatar name="AKọ" size={48} /><View style={{ flex: 1, gap: 7 }}><Skeleton width="46%" /><Skeleton width="76%" height={12} /></View></View></Card><EmptyState icon="message-outline" title="No conversations loaded" message="Messaging is intentionally offline until its secure native feature phase." /></Section></Screen>; }
