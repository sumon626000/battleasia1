CREATE OR REPLACE FUNCTION public.trg_notify_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_name text;
BEGIN
  SELECT match_name INTO v_name FROM public.matches WHERE id = COALESCE(NEW.match_id, OLD.match_id);
  IF TG_OP='INSERT' THEN
    PERFORM notify_user(NEW.user_id,'match_joined','Match joined',
      'You joined '||COALESCE(v_name,'a match')||'. Good luck!','match');
  ELSIF TG_OP='UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status='refunded'::participant_status THEN
      PERFORM notify_user(NEW.user_id,'match_refund_completed','Refund credited',
        'Entry fee for '||COALESCE(v_name,'match')||' refunded to your wallet.','wallet');
    ELSIF NEW.status IN ('win'::participant_status,'loss'::participant_status)
          AND NEW.result_applied AND NOT OLD.result_applied THEN
      PERFORM notify_user(NEW.user_id,'result_published','Match results are out',
        'Results published for '||COALESCE(v_name,'a match')||'.','match');
      IF NEW.prize_bac > 0 THEN
        PERFORM notify_user(NEW.user_id,'prize_received','Prize credited',
          'You earned '||NEW.prize_bac||' BAC from '||COALESCE(v_name,'a match')||'.','wallet');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;$function$;