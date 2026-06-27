-- Support RPCs and static pages seed

CREATE OR REPLACE FUNCTION public.create_support_ticket(p_subject text, p_message text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_id bigint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(coalesce(p_subject,'')) < 3 THEN RAISE EXCEPTION 'Subject too short'; END IF;
  IF length(coalesce(p_message,'')) < 3 THEN RAISE EXCEPTION 'Message too short'; END IF;
  IF length(p_subject) > 200 THEN RAISE EXCEPTION 'Subject too long'; END IF;
  IF length(p_message) > 4000 THEN RAISE EXCEPTION 'Message too long'; END IF;
  IF (SELECT count(*) FROM public.support_tickets
      WHERE user_id = v_user AND created_at > now() - interval '5 minutes') >= 3 THEN
    RAISE EXCEPTION 'Too many tickets. Please wait a few minutes.';
  END IF;
  INSERT INTO public.support_tickets(user_id, subject, status, last_message_at, unread_admin)
  VALUES (v_user, p_subject, 'Open', now(), 1)
  RETURNING id INTO v_id;
  INSERT INTO public.support_messages(ticket_id, sender_type, sender_id, message)
  VALUES (v_id, 'user', v_user, p_message);
  RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.send_support_message(p_ticket_id bigint, p_message text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_id bigint; v_owner uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(coalesce(p_message,'')) < 1 THEN RAISE EXCEPTION 'Empty message'; END IF;
  IF length(p_message) > 4000 THEN RAISE EXCEPTION 'Message too long'; END IF;
  SELECT user_id INTO v_owner FROM public.support_tickets WHERE id = p_ticket_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF v_owner <> v_user AND NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF (SELECT count(*) FROM public.support_messages WHERE sender_id = v_user AND created_at > now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION 'Slow down';
  END IF;
  INSERT INTO public.support_messages(ticket_id, sender_type, sender_id, message)
  VALUES (p_ticket_id, CASE WHEN v_user = v_owner THEN 'user'::sender_type ELSE 'admin'::sender_type END, v_user, p_message)
  RETURNING id INTO v_id;
  UPDATE public.support_tickets SET
    last_message_at = now(),
    unread_admin = CASE WHEN v_user = v_owner THEN unread_admin + 1 ELSE unread_admin END,
    unread_user = CASE WHEN v_user <> v_owner THEN unread_user + 1 ELSE unread_user END,
    status = CASE WHEN status = 'Closed' THEN 'Open'::ticket_status ELSE status END
  WHERE id = p_ticket_id;
  RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.close_support_ticket(p_ticket_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_owner uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO v_owner FROM public.support_tickets WHERE id = p_ticket_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF v_owner <> v_user AND NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.support_tickets SET status = 'Closed' WHERE id = p_ticket_id;
END;$$;

CREATE OR REPLACE FUNCTION public.mark_ticket_read(p_ticket_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_owner uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO v_owner FROM public.support_tickets WHERE id = p_ticket_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF v_user = v_owner THEN
    UPDATE public.support_tickets SET unread_user = 0 WHERE id = p_ticket_id;
  ELSIF is_admin() THEN
    UPDATE public.support_tickets SET unread_admin = 0 WHERE id = p_ticket_id;
  END IF;
END;$$;

REVOKE EXECUTE ON FUNCTION public.create_support_ticket(text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_support_message(bigint,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_support_ticket(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_ticket_read(bigint) FROM anon;

-- Seed static pages
INSERT INTO public.static_pages(slug, title, content_html) VALUES
('terms', 'Terms & Conditions', '<h2>Terms & Conditions</h2><p>By using BattleAsia you agree to fair-play, anti-cheat, and tournament rules. Cheating, account sharing, or manipulation results in permanent ban and forfeiture of BAC balance.</p><h3>1. Eligibility</h3><p>Players must be 13+ and provide an accurate PUBG ID.</p><h3>2. Wallet & BAC</h3><p>BAC is a virtual in-app coin. Deposits are processed manually within 24 hours. Withdrawals are capped per configured limits.</p><h3>3. Liability</h3><p>BattleAsia is not liable for network/device issues during matches.</p>'),
('privacy', 'Privacy Policy', '<h2>Privacy Policy</h2><p>We collect your email, PUBG ID, mobile and country for account, payments, and tournament identification. We never sell your data.</p><h3>Storage</h3><p>Data is stored securely on managed cloud infrastructure with row-level security.</p><h3>Your rights</h3><p>You may request account deletion from the Profile page at any time.</p>'),
('refund', 'Refund Policy', '<h2>Refund Policy</h2><p>Match entry fees are non-refundable once the match is locked. Refunds are issued automatically if a match is cancelled by admins.</p><p>Deposit reversals require a support ticket within 7 days of the transaction.</p>'),
('about', 'About BattleAsia', '<h2>About BattleAsia</h2><p>BattleAsia is a competitive PUBG Mobile tournament platform for South Asia. We host daily Solo, Duo and Squad matches with cash-equivalent BAC prizes.</p>'),
('contact', 'Contact Us', '<h2>Contact Us</h2><p>Email: support@battleasia.gg</p><p>For in-app help open a ticket from Dashboard → Support.</p>')
ON CONFLICT (slug) DO NOTHING;
