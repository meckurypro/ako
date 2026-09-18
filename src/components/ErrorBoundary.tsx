import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("Ako crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-ink font-medium">Something went wrong.</p>
          <button
            onClick={() => (window.location.href = "/feed")}
            className="bg-accent text-canvas px-5 py-2 rounded-full text-sm font-medium"
          >
            Back to feed
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
