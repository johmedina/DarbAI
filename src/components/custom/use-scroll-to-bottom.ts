import { useEffect, useRef, RefObject } from "react";

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef       = useRef<T>(null);
  // true while the user is within 80px of the bottom (or hasn't scrolled yet)
  const isAtBottom   = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    const end       = endRef.current;
    if (!container || !end) return;

    function updateBottomState() {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      isAtBottom.current = scrollHeight - scrollTop - clientHeight < 80;
    }

    const observer = new MutationObserver(() => {
      if (isAtBottom.current) {
        end.scrollIntoView({ behavior: "instant", block: "end" });
      }
    });

    container.addEventListener("scroll", updateBottomState, { passive: true });
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", updateBottomState);
    };
  }, []);

  return [containerRef, endRef];
}
