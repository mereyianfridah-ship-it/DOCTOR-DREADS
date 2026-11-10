import { ButtonLink } from "../components/common/Button";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container-page max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">404</p>
        <h1 className="mt-3 text-5xl">Page not found</h1>
        <p className="mt-4 text-lg text-charcoal/70">The page you are looking for doesn't exist or has moved.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/">Back to Home</ButtonLink>
          <ButtonLink to="/shop" variant="outline">Visit the Shop</ButtonLink>
        </div>
      </div>
    </section>
  );
}
