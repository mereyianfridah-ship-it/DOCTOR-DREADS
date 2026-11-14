import type { ImgHTMLAttributes } from "react";
import type { SiteImageSlot } from "../../config/siteImages";
import { useSiteImage } from "../../hooks/useSiteImages";
import { optimizedUrl } from "../../utils/cloudinary";
import { PreviewImage } from "./PreviewImage";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  slot: SiteImageSlot;
  /** Bundled image used until the owner uploads one. */
  fallback: string;
  /** Developer preview photo for the fallback (see PreviewImage). */
  preview?: string;
  /** Widest size this image is ever shown at, in px. */
  width?: number;
  /** Alt text used when the owner didn't write one. Leave empty for decorative backgrounds. */
  alt?: string;
};

/**
 * An image the owner can replace from Admin > Images. Until the lookup finishes it shows a plain
 * block of the same size, so the page never flashes the default photo before the real one.
 */
export function SiteImage({ slot, fallback, preview, width = 1200, alt = "", className, ...rest }: Props) {
  const { loaded, image } = useSiteImage(slot);
  if (!loaded) return <div aria-hidden className={`${className ?? ""} bg-charcoal/10`} />;
  return (
    <PreviewImage
      {...rest}
      className={className}
      src={image ? optimizedUrl(image.url, width) : fallback}
      preview={image ? undefined : preview}
      alt={image?.alt || alt}
    />
  );
}
