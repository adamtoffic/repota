// --- src/templates/registry.ts ---
import type { TemplateDefinition } from "../types";
import { OriginalTemplate } from "./OriginalTemplate";
import { ClassicTemplate } from "./ClassicTemplate";
import { ExecutiveTemplate } from "./ExecutiveTemplate";
import { HeritageTemplate } from "./HeritageTemplate";
import { MinimalTemplate } from "./MinimalTemplate";
import { ModernTemplate } from "./ModernTemplate";
import { ScholarTemplate } from "./ScholarTemplate";

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
  {
    id: "executive_v1",
    name: "Executive Crest",
    description:
      "Institutional banner + compact single-A4 grid tailored for all levels and custom school colors.",
    component: ExecutiveTemplate,
  },
  {
    id: "heritage_v1",
    name: "Heritage Framed",
    description:
      "Ceremonial double-rule collegiate frame with centered crest and classic ink ledger.",
    component: HeritageTemplate,
  },
  {
    id: "scholar_v1",
    name: "Editorial Scholar",
    description:
      "Modern editorial grid with KPI summary strip and inline subject mastery progress bars.",
    component: ScholarTemplate,
  },
];

// Helper function to safely get a template
export const getTemplateById = (id?: string) => {
  const template = TEMPLATE_REGISTRY.find((t) => t.id === id);
  // Default to original_v1 if nothing is found
  return template?.component || OriginalTemplate;
};
