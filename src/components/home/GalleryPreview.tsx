import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { getGallery } from "../../api/endpoints";
import { useAsync } from "../../hooks/useAsync";
import { ButtonLink } from "../common/Button";
import { DemoNotice } from "../common/DemoNotice";
import { SectionHeading } from "../common/SectionHeading";
import { BeforeAfter } from "../gallery/BeforeAfter";

export function GalleryPreview() {
  const { data } = useAsync((s) => getGallery(s), []);
  const galleryItems = data ?? [];
  const stills = galleryItems.filter((g) => !g.isVideo && !g.afterImage).slice(0, 4);
  const transformation = galleryItems.find((g) => g.afterImage);
  const video = galleryItems.find((g) => g.isVideo);
  if (galleryItems.length === 0) return null;
  return (
    <section className="section bg-cream/50">
      <div className="container-page">
        <SectionHeading eyebrow="Gallery" title="Style inspiration" />
        <DemoNotice className="mx-auto mt-8 max-w-2xl">
          Images are <strong>generic placeholders</strong>, not real Dr Dread Kenya client work. Real photography will replace them.
        </DemoNotice>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            {stills.map((g) => (
              <img key={g.id} src={g.image} alt={`${g.title} (placeholder)`} loading="lazy" className="aspect-[4/5] w-full rounded-2xl object-cover" />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {transformation && transformation.afterImage && (
              <BeforeAfter before={transformation.image} after={transformation.afterImage} title={transformation.title} />
            )}
            {video && (
              <Link
                to="/gallery?category=Videos"
                className="group relative block flex-1 min-h-48 overflow-hidden rounded-2xl bg-charcoal"
                aria-label="Video placeholder, open video gallery"
              >
                <img src={video.image} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition group-hover:scale-105" />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-offwhite">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-charcoal">
                    <Play className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold">Video placeholder</span>
                </span>
              </Link>
            )}
          </div>
        </div>
        <div className="mt-12 text-center">
          <ButtonLink to="/gallery" variant="secondary">
            View Full Gallery
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
