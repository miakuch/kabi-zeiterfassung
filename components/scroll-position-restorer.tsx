"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const scrollStorageKey = "kabi:preserve-scroll-y";

function storeScrollPosition() {
  window.sessionStorage.setItem(scrollStorageKey, String(window.scrollY));
}

function restoreScrollPosition() {
  const storedValue = window.sessionStorage.getItem(scrollStorageKey);

  if (!storedValue) {
    return;
  }

  window.sessionStorage.removeItem(scrollStorageKey);
  const scrollY = Number(storedValue);

  if (!Number.isFinite(scrollY)) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY });
    });
  });
}

export function ScrollPositionRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    restoreScrollPosition();
  }, [pathname, search]);

  useEffect(() => {
    function handleSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;

      if (form?.dataset.preserveScroll === "true") {
        storeScrollPosition();
      }
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest<HTMLAnchorElement>(
        "a[data-preserve-scroll='true']",
      );

      if (link) {
        storeScrollPosition();
      }
    }

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
