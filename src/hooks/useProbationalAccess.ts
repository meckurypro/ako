// src/hooks/useProbationalAccess.ts
//
// Client-side helper for the probational (pending-review) partial-
// access system — see the probational_partial_access migration and
// fn_can_access_feature in the DB. A pending account gets full
// navigation into the app (see RequireAuth.tsx); individual pages
// and actions are locked per-feature instead, each behind its own
// probational_*_enabled row in feature_flags (admin-toggleable from
// Admin > Feature flags > Probational users).
//
// This is the UX layer only — the real enforcement for follow/
// message/react lives in RLS, and for post/comment in the
// create-post/create-comment edge functions, all via the same
// fn_can_access_feature(key, uid) the flags here mirror.
import { useAccountAccess } from "./useAccountAccess";
import { useFeatureFlag } from "./useFeatureFlags";

/** True only for a pending account while the review gate is on. */
export function useIsProbational(): boolean {
  const { data } = useAccountAccess();
  return !!data?.isProbational;
}

/**
 * Whether a given probational_*_enabled feature is locked for the
 * CURRENT user right now. Always false for an approved user (or
 * anyone once the gate is off) — the lock only ever applies to a
 * probational account.
 */
export function useProbationalLock(featureKey: string): boolean {
  const isProbational = useIsProbational();
  const featureEnabled = useFeatureFlag(featureKey);
  return isProbational && !featureEnabled;
}

/**
 * Whether the "+" Create entry point has nothing to offer a
 * probational user right now — i.e. both Post and Create project are
 * locked. Used to hide the "+" itself rather than send someone into
 * an empty CreateChoice sheet. Always false for anyone not
 * probational.
 */
export function useCreateEntirelyLocked(): boolean {
  const postLocked = useProbationalLock("probational_post_enabled");
  const createProjectLocked = useProbationalLock("probational_create_project_enabled");
  return postLocked && createProjectLocked;
}
