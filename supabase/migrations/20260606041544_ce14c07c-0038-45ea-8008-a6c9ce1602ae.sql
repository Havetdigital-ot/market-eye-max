CREATE TABLE public.brand_generation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order INT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_voice TEXT NOT NULL,
  color_palette JSONB NOT NULL,
  font_primary TEXT NOT NULL,
  font_secondary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_generation_templates TO authenticated;
GRANT ALL ON public.brand_generation_templates TO service_role;

ALTER TABLE public.brand_generation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read brand templates"
  ON public.brand_generation_templates FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.brand_generation_templates (sort_order, brand_name, brand_voice, color_palette, font_primary, font_secondary) VALUES
  (0, 'Driftwood Coffee Co.',
   'Warm, knowledgeable, and unpretentious — like a trusted friend who happens to be a barista.',
   '["#1F2A24","#3E7C5A","#A8C3A0","#E9F0E6","#F6F4EE"]'::jsonb,
   'Fraunces', 'Hanken Grotesk'),
  (1, 'Ember & Oak',
   'Bold, energetic, and a little irreverent — for a brand that doesn''t take itself too seriously.',
   '["#2A1E16","#C8794A","#E8DCC8","#7A8B6F","#F4EFE6"]'::jsonb,
   'Canela', 'Inter'),
  (2, 'Slow Pour Society',
   'Refined and editorial, with quiet confidence — speaking to discerning, design-led buyers.',
   '["#16202E","#3A6EA5","#9FC3E8","#E6EEF6","#F4F7FA"]'::jsonb,
   'Spectral', 'Söhne');
