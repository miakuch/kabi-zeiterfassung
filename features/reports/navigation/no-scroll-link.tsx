"use client";

import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent } from "react";

type NoScrollLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

export function NoScrollLink({
  href,
  onClick,
  target,
  ...props
}: NoScrollLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (target && target !== "_self")
    ) {
      return;
    }

    event.preventDefault();
    router.replace(href, { scroll: false });
  }

  return (
    <a href={href} onClick={handleClick} target={target} {...props} />
  );
}
