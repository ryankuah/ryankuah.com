import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import ComponentRenderer from "@/components/renderers/ComponentRenderer";
import type { Page, ViewMode } from "@/types/types";
import {
  getTemplatesByType,
  type Template,
  type TemplateType,
} from "@/actions/template";

export default function TemplateSelector({
  onSelect,
  viewMode,
}: {
  onSelect: (template: Page) => void;
  viewMode: ViewMode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  // Map ViewMode to TemplateType
  const getTemplateType = (mode: ViewMode): TemplateType => {
    switch (mode) {
      case "onboard":
        return "onboard";
      case "results":
        return "results";
      case "edit":
      default:
        return "quizpage";
    }
  };

  // Fetch templates when component mounts or viewMode changes
  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      try {
        const templateType = getTemplateType(viewMode);
        const fetchedTemplates = await getTemplatesByType(templateType);
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Error fetching templates:", error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchTemplates();
  }, [viewMode]);

  const handleTemplateSelect = (template: Template) => {
    onSelect(template.templateData);
    setIsExpanded(false);
  };

  const getButtonText = () => {
    switch (viewMode) {
      case "onboard":
        return "Select a start page template";
      case "results":
        return "Select a results template";
      default:
        return "Select a quiz page template";
    }
  };

  return (
    <section className="w-full overflow-y-hidden">
      <Button
        variant="outline"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="mb-4 w-full justify-between rounded-md border border-purple-300 bg-white px-4 py-2 text-purple-700 shadow-sm transition-all hover:border-purple-400 focus:ring-2 focus:ring-purple-400"
        aria-expanded={isExpanded}
        aria-controls="template-grid"
      >
        {isExpanded ? "Hide Templates" : getButtonText()}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 opacity-50" />
        ) : (
          <ChevronDown className="h-4 w-4 opacity-50" />
        )}
      </Button>

      {isExpanded && (
        <div
          id="template-grid"
          className="grid gap-4 sm:grid-cols-2 md:grid-cols-3"
        >
          {loading ? (
            <div className="col-span-full flex items-center justify-center p-8 text-gray-500">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full flex items-center justify-center p-8 text-gray-500">
              No templates available for {viewMode} mode
            </div>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="flex flex-col items-start overflow-hidden rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-purple-300 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {/* Phone-shaped Thumbnail */}
                <div
                  className="relative aspect-[9/16] w-full max-w-[80px] overflow-hidden rounded-md border border-gray-300 bg-white shadow-inner"
                  style={{
                    backgroundColor:
                      template.templateData.background?.color ?? "#ffffff",
                    backgroundImage: template.templateData.background?.image
                      ? `url(${template.templateData.background.image})`
                      : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div
                    className="absolute left-0 top-0"
                    style={{
                      opacity:
                        template.templateData.background?.settings?.opacity ??
                        1,
                      transform: "scale(0.2)",
                      transformOrigin: "top left",
                      width: "500%", // 100 / 0.2
                      height: "100%", // Keep proportional height
                      pointerEvents: "none", // Prevent interactions inside thumbnail
                    }}
                  >
                    {template.templateData.components?.map((component, idx) => (
                      <ComponentRenderer
                        key={idx}
                        component={component}
                        isThumbnail={true}
                        scale={1.3}
                      />
                    ))}
                  </div>
                </div>
                {/* Template Info */}
                <h5 className="truncate text-wrap text-sm font-medium text-gray-900">
                  {template.name}
                </h5>
                <p className="text-xs text-gray-500">
                  {template.templateData.components?.length ?? 0} components
                </p>
                {template.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                    {template.description}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
}
