import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render error anywhere below this would otherwise
 * unmount the whole tree and leave a blank page with no explanation.
 */
export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // TODO(observability): forward to a reporting service when one exists.
    console.error("Dashboard crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-3 bg-bg p-8 text-center text-text-primary"
      >
        <h1 className="font-display text-lg font-bold">
          The dashboard hit an unexpected error
        </h1>
        <p className="max-w-md text-sm text-text-secondary">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-accent-hover"
        >
          Reload the dashboard
        </button>
      </div>
    );
  }
}
