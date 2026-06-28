INSERT INTO public.theme_config (id, name, description, preview_color, price_bac, is_active, is_default, sort_order)
VALUES ('official', 'Official Light', 'Clean, minimal PUBG-official inspired light theme.', '#f5f5f5', 800, true, false, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  preview_color = EXCLUDED.preview_color,
  price_bac = EXCLUDED.price_bac,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;