import { useAsync } from "../hooks/useAsync";
import { api } from "../api/client";

export interface TikTokVideo {
  id: number;
  url: string;
  videoId: string;
  title: string;
  sortOrder: number;
}

export function TikTokSection() {
  const { data } = useAsync<TikTokVideo[]>(
    // FIXED: Removed the extra "api/" at the start, because api() adds it automatically
    (signal) => api<TikTokVideo[]>("/tiktok/public", { signal }),
    []
  );

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="bg-cream/30 py-16">
      <div className="container-page">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-bold text-charcoal">
            Check us out on TikTok
          </h2>
          <p className="mt-2 text-charcoal/60">
            Watch our latest loc transformations and hair care tips.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((video: TikTokVideo) => {
            if (!video.videoId) return null;

            return (
              <div
                key={video.id}
                className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-charcoal/10"
              >
                <div className="w-full flex justify-center overflow-hidden rounded-xl bg-black/5">
                  <iframe
                    src={`https://www.tiktok.com/embed/v2/${video.videoId}`}
                    width="100%"
                    height="575"
                    style={{ border: "none", maxWidth: "325px" }}
                    allow="encrypted-media;"
                    allowFullScreen
                    className="rounded-xl shadow-md"
                  />
                </div>
                {video.title && (
                  <p className="mt-4 text-center text-sm font-medium text-charcoal/80 line-clamp-2">
                    {video.title}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}