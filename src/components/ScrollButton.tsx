import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export function ScrollButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Show button after scrolling down 300px
      setIsVisible(scrolled > 300);

      // Check if near bottom (within 100px)
      setIsAtBottom(scrolled + windowHeight >= documentHeight - 100);
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    toggleVisibility(); // Check initial state

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={isAtBottom ? scrollToTop : scrollToBottom}
      className="fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg transition-opacity active:opacity-80 sm:h-12 sm:w-12"
      aria-label={isAtBottom ? "Scroll to top" : "Scroll to bottom"}
      title={isAtBottom ? "Back to top" : "Jump to bottom"}
    >
      {isAtBottom ? (
        <ArrowUp className="h-6 w-6 sm:h-5 sm:w-5" />
      ) : (
        <ArrowDown className="h-6 w-6 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
