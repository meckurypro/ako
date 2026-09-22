import { useNetworkStatus } from "@/lib/offline";
import { EmptyState } from "./EmptyState";

export function ErrorState({ message = "Something went wrong. Please try again.", onRetry }: { message?: string; onRetry?: () => void }) {
  const online = useNetworkStatus();
  const offlineMessage = "No network connection. Showing saved data where available; new data will load when you are back online.";
  return <EmptyState icon={online ? "alert-circle-outline" : "wifi-off"} title={online ? "Couldn’t load this" : "You’re offline"} message={online ? message : offlineMessage} actionLabel={online && onRetry ? "Try again" : undefined} onAction={online ? onRetry : undefined} />;
}
