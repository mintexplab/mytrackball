-- Ensure Trackball Free and Label Free plans exist
INSERT INTO public.plans (name, description, price, max_releases, features)
VALUES 
  ('Trackball Free', 'Free plan for individual artists', 0, 5, '["Basic distribution", "Release management", "Royalty tracking"]'::jsonb),
  ('Label Free', 'Free plan for labels managing artists', 0, 10, '["Basic distribution", "Artist management", "Release management", "Label tools"]'::jsonb)
ON CONFLICT (name) DO NOTHING;