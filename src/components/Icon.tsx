import { useEffect, useRef } from "react";

declare global {
  interface Window {
    lucide?: {
      createIcons: (options?: {
        icons?: unknown;
        nameAttr?: string;
        attrs?: Record<string, string>;
      }) => void;
    };
  }
}

type IconProps = {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

/**
 * Renders a Lucide icon via the CDN script attached in index.html.
 * We imperatively manage the inner <i data-lucide> placeholder and call
 * lucide.createIcons() so re-renders or prop changes always reflect correctly.
 */
export function Icon({
  name,
  size = 20,
  className = "",
  strokeWidth = 2,
}: IconProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapperRef.current;
    if (!wrap) return;
    wrap.innerHTML = "";
    const i = document.createElement("i");
    i.setAttribute("data-lucide", name);
    wrap.appendChild(i);

    const apply = () => {
      window.lucide?.createIcons({
        nameAttr: "data-lucide",
        attrs: {
          width: String(size),
          height: String(size),
          "stroke-width": String(strokeWidth),
        },
      });
    };

    if (window.lucide?.createIcons) {
      apply();
    } else {
      // Wait for CDN script to load
      const timer = setInterval(() => {
        if (window.lucide?.createIcons) {
          apply();
          clearInterval(timer);
        }
      }, 50);
      return () => clearInterval(timer);
    }
  }, [name, size, strokeWidth]);

  return (
    <span
      ref={wrapperRef}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
