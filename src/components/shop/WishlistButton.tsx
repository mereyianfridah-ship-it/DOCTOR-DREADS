import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlist } from "../../context/WishlistContext";

/** Round heart toggle. Place inside a `relative` container (it positions itself top-right). */
export function WishlistButton({ slug, name, className = "absolute right-3 top-3" }: { slug: string; name: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(slug);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault(); // the card image is a link
    e.stopPropagation();
    toast(toggle(slug) ? `${name} saved to your wishlist` : `${name} removed from your wishlist`);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={`${className} z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 hover:bg-white`}
    >
      <Heart className={`h-5 w-5 ${saved ? "fill-red-600 text-red-600" : "text-charcoal"}`} aria-hidden />
    </button>
  );
}
