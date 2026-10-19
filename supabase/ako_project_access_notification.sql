-- ako_project_access_notification.sql
-- Notify a user when the owner adds them to a PRIVATE project's access list (project_members).
-- Applied to the "Ako Temp" Supabase project. Mirrors notify_project_tag().
--   * skips self-adds and rows with no added_by
--   * skips if the user already has an UNREAD project_access_granted for the same project (remove + re-add)
--   * actor = owner, target = project, preview_text = project title
--   * push: send-activity-push COPY has a matching project_access_granted entry

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY['like','dislike','support','disagree','pushback','reshare','quote','comment_reply','follow','mention','gift_received','moderation_notice','system','message','follow_request','follow_request_accepted','page_role_invite','page_role_accepted','page_role_declined','comment_like','comment_dislike','post_comment_activity','admin_message','post_tagged','project_tagged','collaboration_invite','collaboration_accepted','collaboration_declined','promotion_approved','promotion_declined','post_published','room_meeting_scheduled','comment','share','give_back_received','gig_created_from_collaboration','music_credit_request','project_purchased','affiliate_commission_earned','withdrawal_status','foreword_invite','foreword_submitted','foreword_approved','foreword_declined','project_access_granted']::text[]));

CREATE OR REPLACE FUNCTION public.notify_project_access_granted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare v_title text;
begin
  if new.added_by is null or new.user_id = new.added_by then return new; end if;
  if exists (select 1 from public.notifications
             where user_id = new.user_id and type = 'project_access_granted'
               and target_id = new.project_id and read_at is null) then
    return new;
  end if;
  select title into v_title from public.projects where id = new.project_id;
  insert into public.notifications (user_id, type, actor_id, target_type, target_id, preview_text)
  values (new.user_id, 'project_access_granted', new.added_by, 'project', new.project_id, v_title);
  return new;
end $$;

DROP TRIGGER IF EXISTS notify_on_project_member_added ON public.project_members;
CREATE TRIGGER notify_on_project_member_added
AFTER INSERT ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.notify_project_access_granted();
