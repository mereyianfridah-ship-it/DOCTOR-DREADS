import { useState, type ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null };

/**
 * Shows an image exactly as supplied. If there is no image, or it fails to load, nothing is drawn,
 * so the surrounding block (which has its own background) stays clean instead of showing a stand-in picture.
 */
export function SafeImage({ src, alt = "", onError, ...rest }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return null;
  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      onError={(e) => {
        setFailed(src);
        onError?.(e);
      }}
    />
  );
}
