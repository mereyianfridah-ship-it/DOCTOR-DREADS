-- Attach Cloudinary public IDs to existing public/private media so uploads can
-- be replaced and deleted without touching local disk.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gallery' AND column_name = 'cloudinary_public_id'
  ) THEN
    ALTER TABLE gallery ADD COLUMN cloudinary_public_id TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultation_photos' AND column_name = 'cloudinary_public_id'
  ) THEN
    ALTER TABLE consultation_photos ADD COLUMN cloudinary_public_id TEXT;
  END IF;
END $$;
