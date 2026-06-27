
-- Phase 43: Auto Notification triggers
-- Helper: insert notification (uses notification_templates if present, else fallback text)
CREATE OR REPLACE FUNCTION public.notify_user(p_user_id uuid, p_key text, p_default_title text, p_default_message text, p_type text DEFAULT 'system')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_title text; v_message text;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  BEGIN
    SELECT title, body INTO v_title, v_message
      FROM public.notification_templates WHERE key = p_key AND is_active = true LIMIT 1;
  EXCEPTION WHEN undefined_column THEN v_title := NULL;
  END;
  v_title := COALESCE(v_title, p_default_title);
  v_message := COALESCE(v_message, p_default_message);
  INSERT INTO public.user_notifications(user_id, title, message, type)
  VALUES (p_user_id, v_title, v_message, p_type);
END;$$;

-- 1. Deposit submitted / 2,3. approved / rejected
CREATE OR REPLACE FUNCTION public.trg_notify_deposit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM notify_user(NEW.user_id,'deposit_submitted','Deposit request received',
      'Your deposit of '||NEW.bac_amount||' BAC is under review.','wallet');
  ELSIF TG_OP='UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status='Approved' THEN
      PERFORM notify_user(NEW.user_id,'deposit_approved','BAC coins credited',
        NEW.bac_amount||' BAC has been credited to your wallet.','wallet');
    ELSIF NEW.status='Rejected' THEN
      PERFORM notify_user(NEW.user_id,'deposit_rejected','Deposit rejected',
        'Your deposit was rejected. Reason: '||COALESCE(NEW.reject_reason,'N/A'),'wallet');
    END IF;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_deposit ON public.deposits;
CREATE TRIGGER trg_notify_deposit AFTER INSERT OR UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION trg_notify_deposit();

-- 4,5,6. Withdraw
CREATE OR REPLACE FUNCTION public.trg_notify_withdraw() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    PERFORM notify_user(NEW.user_id,'withdraw_requested','Withdraw request submitted',
      'Your withdrawal of '||NEW.bac_amount||' BAC is pending review.','wallet');
  ELSIF TG_OP='UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status='Approved' THEN
      PERFORM notify_user(NEW.user_id,'withdraw_paid','Withdrawal processed',
        'Your withdrawal of '||NEW.bac_amount||' BAC has been processed.','wallet');
    ELSIF NEW.status='Rejected' THEN
      PERFORM notify_user(NEW.user_id,'withdraw_rejected','Withdrawal rejected',
        'Your withdrawal was rejected and your balance refunded. Reason: '||COALESCE(NEW.cancel_reason,'N/A'),'wallet');
    END IF;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_withdraw ON public.withdrawals;
CREATE TRIGGER trg_notify_withdraw AFTER INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION trg_notify_withdraw();

-- 7,8,9,10,11. Match participation events
CREATE OR REPLACE FUNCTION public.trg_notify_participant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text;
BEGIN
  SELECT match_name INTO v_name FROM public.matches WHERE id = COALESCE(NEW.match_id, OLD.match_id);
  IF TG_OP='INSERT' THEN
    PERFORM notify_user(NEW.user_id,'match_joined','Match joined',
      'You joined '||COALESCE(v_name,'a match')||'. Good luck!','match');
  ELSIF TG_OP='UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status='refunded' THEN
      PERFORM notify_user(NEW.user_id,'match_refund_completed','Refund credited',
        'Entry fee for '||COALESCE(v_name,'match')||' refunded to your wallet.','wallet');
    ELSIF NEW.status='completed' AND NEW.result_applied AND NOT OLD.result_applied THEN
      PERFORM notify_user(NEW.user_id,'result_published','Match results are out',
        'Results published for '||COALESCE(v_name,'a match')||'.','match');
      IF NEW.prize_bac > 0 THEN
        PERFORM notify_user(NEW.user_id,'prize_received','Prize credited',
          'You earned '||NEW.prize_bac||' BAC from '||COALESCE(v_name,'a match')||'.','wallet');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_participant ON public.match_participants;
CREATE TRIGGER trg_notify_participant AFTER INSERT OR UPDATE ON public.match_participants
  FOR EACH ROW EXECUTE FUNCTION trg_notify_participant();

-- 8. Match cancellation broadcast (when match.status -> Cancelled)
CREATE OR REPLACE FUNCTION public.trg_notify_match_cancel() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.status='Cancelled' AND OLD.status<>'Cancelled' THEN
    INSERT INTO public.user_notifications(user_id,title,message,type)
    SELECT DISTINCT user_id,'Match cancelled',
      'Match "'||COALESCE(NEW.match_name,'')||'" was cancelled. Any entry fee has been refunded.','match'
    FROM public.match_participants WHERE match_id = NEW.id;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_match_cancel ON public.matches;
CREATE TRIGGER trg_notify_match_cancel AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION trg_notify_match_cancel();

-- 12,13. Premium activate / extend
CREATE OR REPLACE FUNCTION public.trg_notify_premium() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.type='activate' THEN
    PERFORM notify_user(NEW.user_id,'premium_activated','Premium active',
      'Your premium is active until '||to_char(NEW.expires_at,'YYYY-MM-DD')||'.','premium');
  ELSIF NEW.type='extend' THEN
    PERFORM notify_user(NEW.user_id,'premium_extended','Premium extended',
      'Premium extended. New expiry: '||to_char(NEW.expires_at,'YYYY-MM-DD')||'.','premium');
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_premium ON public.premium_histories;
CREATE TRIGGER trg_notify_premium AFTER INSERT ON public.premium_histories
  FOR EACH ROW EXECUTE FUNCTION trg_notify_premium();

-- 14,15. Premium expiring/expired sweep (callable via cron)
CREATE OR REPLACE FUNCTION public.notify_premium_lifecycle() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count int := 0;
BEGIN
  -- Expiring within 3 days, only once per user per day
  INSERT INTO public.user_notifications(user_id,title,message,type)
  SELECT p.id,'Premium expires soon',
    'Your premium expires on '||to_char(p.premium_expires_at,'YYYY-MM-DD')||'.','premium'
  FROM public.profiles p
  WHERE p.premium_expires_at BETWEEN now() AND now()+interval '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_notifications n
      WHERE n.user_id=p.id AND n.type='premium' AND n.title='Premium expires soon'
        AND n.created_at > now()-interval '24 hours'
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.user_notifications(user_id,title,message,type)
  SELECT p.id,'Premium expired','Your premium has expired. Renew to keep your benefits.','premium'
  FROM public.profiles p
  WHERE p.premium_expires_at IS NOT NULL
    AND p.premium_expires_at < now()
    AND p.premium_expires_at > now()-interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_notifications n
      WHERE n.user_id=p.id AND n.type='premium' AND n.title='Premium expired'
        AND n.created_at > now()-interval '7 days'
    );
  RETURN v_count;
END;$$;

-- 16. Referral bonus
CREATE OR REPLACE FUNCTION public.trg_notify_referral() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (TG_OP='INSERT' AND NEW.status='credited') OR
     (TG_OP='UPDATE' AND NEW.status='credited' AND OLD.status<>'credited') THEN
    PERFORM notify_user(NEW.referrer_user_id,'referral_bonus','Referral commission received',
      'You earned '||NEW.bonus_bac||' BAC from your referral.','referral');
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_referral ON public.referral_transactions;
CREATE TRIGGER trg_notify_referral AFTER INSERT OR UPDATE ON public.referral_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_notify_referral();

-- 17. Support reply (admin -> user)
CREATE OR REPLACE FUNCTION public.trg_notify_support_reply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.sender_type='admin' THEN
    SELECT user_id INTO v_owner FROM public.support_tickets WHERE id = NEW.ticket_id;
    IF v_owner IS NOT NULL THEN
      PERFORM notify_user(v_owner,'support_reply','Support replied',
        'An admin replied to your ticket #'||NEW.ticket_id||'.','support');
    END IF;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_support_reply ON public.support_messages;
CREATE TRIGGER trg_notify_support_reply AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION trg_notify_support_reply();

-- 18. Account suspended
CREATE OR REPLACE FUNCTION public.trg_notify_suspension() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.is_suspended AND NOT OLD.is_suspended THEN
    PERFORM notify_user(NEW.id,'account_suspended','Account suspended',
      'Your account has been suspended. Reason: '||COALESCE(NEW.suspension_reason,'Not specified'),'account');
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_notify_suspension ON public.profiles;
CREATE TRIGGER trg_notify_suspension AFTER UPDATE OF is_suspended ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION trg_notify_suspension();
