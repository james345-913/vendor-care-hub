import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EVIDENCE_BUCKET } from "@/lib/evidence";

export function EvidenceGallery({ paths }: { paths: string[] }) {
  const { data: urls, isError } = useQuery({
    queryKey: ["evidence", paths],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      return data.map((d) => d.signedUrl).filter(Boolean) as string[];
    },
    staleTime: 50 * 60 * 1000,
  });

  return (
    <div className="mt-6">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <ImageIcon className="h-4 w-4 text-accent" /> Photo evidence ({paths.length})
      </h2>
      {isError ? (
        <p className="text-sm text-muted-foreground">Photos could not be loaded.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {(urls ?? paths.map(() => "")).map((src, i) =>
            src ? (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="block h-28 w-28 overflow-hidden rounded-xl border bg-muted transition-opacity hover:opacity-90"
              >
                <img src={src} alt={`Evidence photo ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            ) : (
              <div key={i} className="h-28 w-28 animate-pulse rounded-xl bg-muted" />
            ),
          )}
        </div>
      )}
    </div>
  );
}
