import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  failed: boolean;
}

/** Catches render errors so a bug in one page shows a recovery screen instead of a blank site. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center" role="alert">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Something went wrong</p>
        <h1 className="mt-3 text-4xl">We hit a snag</h1>
        <p className="mt-4 text-lg text-charcoal/70">The page failed to load. Please reload; if it keeps happening, contact us on WhatsApp.</p>
        <div className="mt-8 flex gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-charcoal px-6 py-3 text-offwhite">
            Reload page
          </button>
          <a href="/" className="rounded-full border border-charcoal/30 px-6 py-3">
            Go home
          </a>
        </div>
      </section>
    );
  }
}
