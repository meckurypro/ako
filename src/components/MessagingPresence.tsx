// src/components/MessagingPresence.tsx
import { useGlobalMessageDelivery } from "../hooks/useMessaging";

/**
 * Renders nothing — just mounts the app-wide message-delivery tracker
 * (see useGlobalMessageDelivery in useMessaging.ts) for the logged-in
 * user. Mount this ONCE, inside AuthProvider so useAuth() resolves, and
 * outside/above individual routes so it stays alive across navigation.
 */
export function MessagingPresence() {
  useGlobalMessageDelivery();
  return null;
}
