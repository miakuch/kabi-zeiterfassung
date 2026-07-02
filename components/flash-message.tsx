"use client";

import { useEffect, useState } from "react";
import { CircleAlert, X } from "lucide-react";

type FlashMessageProps = {
  message: string;
  title?: string;
};

export function FlashMessage({
  message,
  title = "Aktion nicht möglich",
}: FlashMessageProps) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const isVisible = dismissedMessage !== message;

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedMessage(message);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isVisible, message]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border border-primary/30 bg-primary/15 p-4 text-sm text-accent-foreground shadow-lg backdrop-blur"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 leading-6">{message}</p>
        </div>
        <button
          aria-label="Hinweis schließen"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setDismissedMessage(message)}
          type="button"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
