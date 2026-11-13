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
  const { data } = useAsync<(TikTokVideo[])>(
    (signal) => api<TikTokVideo[]>("api/tiktok/public", { signal }),
    []
  );

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="section max-w-7xl mx-auto px-4 py-12">
      <div className="text-center">
        <h2 className="mb-8 text-3xl font-bold text-charcoal">
          Check us out on TikTok
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((video: TikTokVideo) => {
            // Skip if no videoId
            if (!video.videoId) return null;

            return (
              <div
                key={video.id}
                className="rounded-xl overflow-hidden border"
              >
                <iframe
                  src={`https://www.tiktok.com/embed/v2/${video.videoId}`}
                  width={325}
                  height={575}
                  style={{ border: "0px", width: "100%" }}
                  allow="encrypted-media;"
                  allowFullScreen
                  className="rounded-xl shadow-lg border-0"
                />
                {video.title && (
                  <p
                    key={`title-${video.id}`}
                    className="mt-3 text-sm text-charcoal/80"
                  >
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