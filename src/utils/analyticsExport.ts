// src/utils/analyticsExport.ts

/**
 * Export analytics chart as PNG image
 */
export async function exportChartAsPNG(chartId: string, filename: string): Promise<void> {
  try {
    // Validate inputs
    if (!chartId || !filename) {
      throw new Error("Chart ID and filename are required");
    }

    const chartElement = document.getElementById(chartId);
    if (!chartElement) {
      throw new Error(`Chart not found. Please ensure the chart is visible.`);
    }

    // Find the SVG element within the chart
    const svgElement = chartElement.querySelector("svg");
    if (!svgElement) {
      throw new Error("Chart could not be rendered. Please try again.");
    }

    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create an image from SVG
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement("canvas");
          const rect = svgElement.getBoundingClientRect();
          canvas.width = rect.width * 2; // 2x for better quality
          canvas.height = rect.height * 2;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(svgUrl);
            reject(new Error("Failed to initialize image export"));
            return;
          }

          // Scale for high DPI
          ctx.scale(2, 2);

          // Fill white background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw image
          ctx.drawImage(img, 0, 0, rect.width, rect.height);

          // Convert to blob and download
          canvas.toBlob((blob) => {
            if (!blob) {
              URL.revokeObjectURL(svgUrl);
              reject(new Error("Failed to create image"));
              return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();

            URL.revokeObjectURL(url);
            URL.revokeObjectURL(svgUrl);
            resolve();
          }, "image/png");
        } catch (err) {
          URL.revokeObjectURL(svgUrl);
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error("Failed to process chart image"));
      };

      img.src = svgUrl;
    });
  } catch (error) {
    console.error("Chart Export Error:", error);
    throw error;
  }
}

/**
 * Export analytics page as PDF (using browser print)
 */
export function exportAnalyticsAsPDF(): void {
  // Hide export buttons and other UI elements before printing
  const elementsToHide = document.querySelectorAll('[data-no-print="true"]');
  elementsToHide.forEach((el) => {
    (el as HTMLElement).style.display = "none";
  });

  // Restore elements after print
  const restoreElements = () => {
    elementsToHide.forEach((el) => {
      (el as HTMLElement).style.display = "";
    });
    window.removeEventListener("afterprint", restoreElements);
  };

  window.addEventListener("afterprint", restoreElements);

  // Fallback timeout in case afterprint doesn't fire
  setTimeout(restoreElements, 3000);

  // Trigger print dialog
  window.print();
}

/**
 * Export analytics data as CSV
 */
export function exportAnalyticsData(
  data: Record<string, string | number | boolean | null>[],
  filename: string,
  headers?: string[],
): void {
  try {
    // Validate inputs
    if (!data || data.length === 0) {
      throw new Error("No data available to export");
    }
    if (!filename || filename.trim() === "") {
      throw new Error("Invalid filename");
    }

    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);

    if (csvHeaders.length === 0) {
      throw new Error("No data columns found");
    }

    // Build CSV content
    const csvRows = [
      csvHeaders.join(","), // Header row
      ...data.map((row) =>
        csvHeaders
          .map((header) => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value ?? "");
            return stringValue.includes(",") || stringValue.includes('"')
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue;
          })
          .join(","),
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Analytics Export Error:", error);
    throw error;
  }
}
