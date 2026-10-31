-- ako_group_dm_privacy.sql
-- Privacy: "Allow messages from my groups". When on, people who share a group or cohort with you (a room_members row in
-- the same room project, or owning it) can message you directly; everyone else you don't follow still sends a message
-- request. Off by default, so nothing changes until someone opts in. New conversations only; existing threads keep their
-- state. Applied to the Ako project as migration ako_group_dm_privacy.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accept_group_messages boolean NOT NULL DEFAULT false;

-- get_or_create_direct_conversation: unchanged except the recipient's row is a normal inbox thread (not a request)
-- when they follow the sender OR (accept_group_messages AND the two share a group/cohort). See the live function.
