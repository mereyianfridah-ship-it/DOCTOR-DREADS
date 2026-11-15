import type { ImgHTMLAttributes } from "react";
import type { SiteImageSlot } from "../../config/siteImages";
import { useSiteImage } from "../../hooks/useSiteImages";
import { optimizedUrl } from "../../utils/cloudinary";
import { SafeImage } from "./SafeImage";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  slot: SiteImageSlot;
  /** Widest size this image is ever shown at, in px. */
  width?: number;
  /** Alt text used when the owner didn't write one. Leave empty for decorative backgrounds. */
  alt?: string;
};

/**
 * An image the owner uploads from Admin > Images. Until the lookup finishes it shows a plain block of
 * the same size; if the owner has not uploaded one, nothing is drawn.
 */
export function SiteImage({ slot, width = 1200, alt = "", className, ...rest }: Props) {
  const { loaded, image } = useSiteImage(slot);
  if (!loaded) return <div aria-hidden className={`${className ?? ""} bg-charcoal/10`} />;
  if (!image) return null;
  return <SafeImage {...rest} className={className} src={optimizedUrl(image.url, width)} alt={image.alt || alt} />;
}
