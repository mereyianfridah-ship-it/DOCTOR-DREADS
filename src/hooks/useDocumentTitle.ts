import { useEffect } from "react";
import { DEFAULT_TITLE, SITE_NAME } from "../utils/pageMeta";

/** Sets the browser tab title for a detail page (e.g. a product) while it is mounted. */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} | ${SITE_NAME}`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
