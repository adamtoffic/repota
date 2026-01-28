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
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
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

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => {
      if (wrapperRef.current) {
        observer.unobserve(wrapperRef.current);
      }
    };
  }, [hasRendered]);

  // Always render during print
  useEffect(() => {
    const handleBeforePrint = () => {
      setIsVisible(true);
      setHasRendered(true);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    return () => window.removeEventListener("beforeprint", handleBeforePrint);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="report-wrapper mb-4 flex h-[130mm] justify-center overflow-hidden sm:h-[230mm] lg:h-auto print:m-0 print:mb-0 print:block print:h-auto print:overflow-visible print:p-0"
      style={{
        pageBreakAfter: index < totalStudents - 1 ? "always" : "auto",
      }}
    >
      {isVisible ? (
        <div className="origin-top scale-[0.40] transform sm:scale-75 lg:scale-100 print:h-full print:w-full print:scale-100 print:transform-none">
          <div className="shadow-2xl print:m-0 print:p-0 print:shadow-none">
            <ReportTemplate student={student} settings={settings} />
          </div>
        </div>
      ) : (
        // Placeholder with exact same height to prevent layout shift
        <div className="flex h-full w-full items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-sm text-gray-500">
              Loading report {index + 1} of {totalStudents}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
