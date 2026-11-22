import { useEffect, useRef, useState } from "react";
import { ReportTemplate } from "./ReportTemplate";
import type { ProcessedStudent, SchoolSettings } from "../types";

interface Props {
  student: ProcessedStudent;
  settings: SchoolSettings;
  index: number;
  totalStudents: number;
}

/**
 * Lazy-loaded report card that only renders when visible in viewport
 * Improves performance for printing 50+ reports
 */
export function LazyReportCard({ student, settings, index, totalStudents }: Props) {
  // Check if we're in print mode at initialization
  const isPrintMode = typeof window !== "undefined" && window.matchMedia("print").matches;
  const [isVisible, setIsVisible] = useState(isPrintMode);
  const [hasRendered, setHasRendered] = useState(isPrintMode);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasRendered) {
            setIsVisible(true);
            setHasRendered(true); // Keep rendered once visible
          }
        });
      },
      {
        rootMargin: "500px", // Load 500px before entering viewport
        threshold: 0,
      },
    );

    const currentRef = wrapperRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasRendered]);

  // Always render during print - Multiple approaches for better compatibility
  useEffect(() => {
    const handleBeforePrint = () => {
      setIsVisible(true);
      setHasRendered(true);
    };

    // Check if we're in print mode via media query
    const printMediaQuery = window.matchMedia("print");
    const handlePrintMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setIsVisible(true);
        setHasRendered(true);
      }
    };

    // Listen for print events
    window.addEventListener("beforeprint", handleBeforePrint);
    printMediaQuery.addEventListener("change", handlePrintMediaChange);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      printMediaQuery.removeEventListener("change", handlePrintMediaChange);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="report-wrapper mb-4 flex h-[130mm] justify-center overflow-hidden sm:h-[230mm] lg:h-auto print:m-0 print:mb-0 print:block print:overflow-visible print:p-0"
      data-is-last={index === totalStudents - 1}
    >
      {isVisible ? (
        <div className="origin-top scale-[0.40] transform sm:scale-75 lg:scale-100 print:w-full print:scale-100 print:transform-none">
          <div
            data-paper-surface="true"
            className="bg-white shadow-2xl print:m-0 print:p-0 print:shadow-none"
          >
            <ReportTemplate student={student} settings={settings} />
          </div>
        </div>
      ) : (
        // Placeholder with exact same height to prevent layout shift
        <div className="bg-subtle flex h-[130mm] w-full items-center justify-center sm:h-[230mm] lg:h-auto">
          <div className="text-center">
            <div className="border-border-strong border-t-primary mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4"></div>
            <p className="text-muted text-sm">
              Loading report {index + 1} of {totalStudents}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
