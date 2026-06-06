
CREATE TABLE public.generated_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  brand_asset_id uuid REFERENCES public.brand_assets(id) ON DELETE SET NULL,
  palette jsonb NOT NULL DEFAULT '[]'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX generated_stores_user_id_idx ON public.generated_stores(user_id);
CREATE INDEX generated_stores_slug_idx ON public.generated_stores(slug);

GRANT SELECT ON public.generated_stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_stores TO authenticated;
GRANT ALL ON public.generated_stores TO service_role;

ALTER TABLE public.generated_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published stores"
  ON public.generated_stores FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "Owners manage their stores"
  ON public.generated_stores FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_generated_stores_updated_at
  BEFORE UPDATE ON public.generated_stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
