import { useState, type ImgHTMLAttributes } from "react";
import { PREVIEW_ENABLED, isBundledPlaceholder, previewSrc } from "../../utils/placeholderImages";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /** The image path from the data (a real upload, or a bundled /images/*.svg placeholder). */
  src?: string | null;
  /**
   * Optional slot-specific preview photo (e.g. serviceImage(slug)). Only used while the
   * data still points at a bundled placeholder or has no image at all.
   */
  preview?: string;
};

/**
 * Renders real client images untouched. While the data only has a bundled SVG placeholder,
 * it shows a matching real photo instead (developer preview). If that photo can't load, it
 * falls back to the original SVG so the layout never breaks.
 */
export function PreviewImage({ src, preview, alt = "", onError, ...rest }: Props) {
  const usePreview = PREVIEW_ENABLED && (!src || isBundledPlaceholder(src));
  const candidates = [usePreview ? (preview ?? previewSrc(src)) : src, src].filter(
    (u, i, a): u is string => !!u && a.indexOf(u) === i,
  );
  const key = candidates.join("|");
  const [state, setState] = useState({ key, stage: 0 });
  const stage = state.key === key ? state.stage : 0;
  const current = candidates[Math.min(stage, candidates.length - 1)];
  if (!current) return null;
  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      onError={(e) => {
        if (stage < candidates.length - 1) setState({ key, stage: stage + 1 });
        onError?.(e);
      }}
    />
  );
}
