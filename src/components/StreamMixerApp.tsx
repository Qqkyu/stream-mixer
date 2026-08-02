import { ErrorBoundary } from "@sentry/react";
import type { FC } from "react";
import EmbedGrid from "./embedGrid/EmbedGrid";
import Header from "./header/Header";
import "../monitoring/sentry";

const ErrorFallback: FC = () => (
  <main className="hero min-h-dvh bg-base-200 p-6 text-center">
    <div className="hero-content">
      <div className="max-w-lg">
        <h1 className="text-3xl font-bold">Stream Mix hit an error</h1>
        <p className="py-5">
          Your saved workspace is still in this browser. Reload the page to try
          opening it again.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Reload Stream Mix
        </button>
      </div>
    </div>
  </main>
);

const StreamMixerApp: FC = () => (
  <ErrorBoundary fallback={<ErrorFallback />}>
    <Header />
    <EmbedGrid />
  </ErrorBoundary>
);

export default StreamMixerApp;
