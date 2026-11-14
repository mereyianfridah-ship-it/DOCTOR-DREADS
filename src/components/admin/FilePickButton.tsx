import { useRef } from "react";
import { Button } from "../common/Button";

/** A button that opens the file picker for one photo. The input is reset so the same file can be chosen again. */
export function FilePickButton({ label, onFile, disabled, variant = "outline" }: { label: string; onFile: (f: File) => void; disabled?: boolean; variant?: "primary" | "outline" | "secondary" }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <Button type="button" size="sm" variant={variant} disabled={disabled} onClick={() => ref.current?.click()}>{label}</Button>
    </>
  );
}
