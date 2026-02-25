// --- src/templates/registry.ts ---
import type { TemplateDefinition } from "../types";
import { OriginalTemplate } from "./OriginalTemplate";
import { ClassicTemplate } from "./ClassicTemplate";
import { ModernTemplate } from "./ModernTemplate";
import { MinimalTemplate } from "./MinimalTemplate";

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  {
    id: "original_v1",
    name: "Repota Original",
    description: "The classic high-density, heavily bordered layout you started with.",
    component: OriginalTemplate,
  },
  {
    id: "classic_v1",
    name: "Classic GES Plus",
    description: "A softer, modern upgrade to the standard grid layout.",
    component: ClassicTemplate,
  },
  {
    id: "modern_v1",
    name: "Modern Dashboard",
    description: "A premium split-layout design. Great for private schools.",
    component: ModernTemplate,
  },
  {
    id: "minimal_v1",
    name: "University Minimal",
    description: "Clean typography with minimal borders. Ideal for SHS.",
    component: MinimalTemplate,
  },
];

// Helper function to safely get a template
export const getTemplateById = (id?: string) => {
  const template = TEMPLATE_REGISTRY.find((t) => t.id === id);
  // Default to original_v1 if nothing is found
  return template?.component || OriginalTemplate;
};
