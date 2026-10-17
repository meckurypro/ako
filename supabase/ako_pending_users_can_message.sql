-- Pending (restricted / consumer-only) accounts can send and receive chat messages.
--
-- Rule: if a user can reach the chat UI, they can send in it. The only thing that blocked pending
-- accounts was the INSERT policy on public.messages ("Users can send messages unless blocked"), which calls
-- fn_can_access_feature('probational_message_enabled', auth.uid()). While that flag was false, every send from a
-- pending account failed with 403 (RLS) and the app showed no reason.
--
-- Receiving was never gated (SELECT policies only check participation). Blocking between users, group-membership
-- and the global messaging_enabled kill switch are unchanged. The flag stays in place, so messaging can be
-- turned off for pending accounts again by setting it to false.
update public.feature_flags
set enabled = true
where key = 'probational_message_enabled';
