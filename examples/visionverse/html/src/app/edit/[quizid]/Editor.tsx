import { useContext, useState } from "react";
import { QuizContext } from "@/quizContext";
import { useTemplateContext } from "@/templateContext";
import { Button } from "@/components/ui/button";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus as PlusIcon,
  Rows as RowsIcon,
  Columns as ColumnsIcon,
  EditIcon,
  ImageIcon,
  TextIcon,
} from "lucide-react";
import type { ComponentType, Page, Component } from "@/types/types";
import BackgroundControls from "@/components/ui/background-controls";
import ComponentEditor from "./ComponentEditor";
import { type ViewMode } from "@/types/types";
import TemplateSelector from "@/app/edit/[quizid]/TemplateSelector";

export default function Editor({ viewMode }: { viewMode: ViewMode }) {
  // Always call all hooks unconditionally at the top level
  const quizContext = useContext(QuizContext);
  const templateContext = useTemplateContext();
  const [componentPopoverOpen, setComponentPopoverOpen] = useState(false);
  const [containerAnimateRef] = useAutoAnimate();
  const [componentsAnimateRef] = useAutoAnimate();

  // Use appropriate context based on viewMode
  const context = viewMode === "template" ? templateContext : quizContext;

  if (!context) {
    return (
      <p className="p-4 text-red-500">
        {viewMode === "template" ? "Template" : "Quiz"} context not found.
      </p>
    );
  }

  const {
    index,
    resultIndex,
    pages,
    onboard,
    results,
    addComponent,
    updatePage,
  } = context;

  // Determine current page based on viewMode
  const currentPage = (): Page | undefined => {
    if (viewMode === "onboard") return onboard;
    if (viewMode === "results") return results[resultIndex];
    if (viewMode === "template") return pages[0]; // Template mode uses first page
    return pages[index];
  };

  const pageData = currentPage();

  if (!pageData)
    return (
      <p className="p-4 text-red-500">Quiz data not found for this page.</p>
    );

  const handleAddComponent = (componentType: ComponentType) => {
    addComponent(viewMode, componentType);
    setComponentPopoverOpen(false);
  };

  const handleTemplateSelect = (template: Page) => {
    updatePage(viewMode, template);
  };

  const name: string = pageData.name ?? "";
  const component: Component[] = pageData.components ?? [];

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-gray-100">
      <div className="flex h-max w-full flex-col p-4" ref={containerAnimateRef}>
        {viewMode === "onboard" ? (
          <div className="mb-4 mt-2 flex h-10 w-full items-center rounded-lg bg-indigo-100 px-4 font-semibold text-indigo-800 shadow-sm">
            <p>Start Page Settings</p>
          </div>
        ) : viewMode === "template" ? (
          <div className="mb-4 mt-2 flex h-10 w-full items-center rounded-lg bg-purple-100 px-4 font-semibold text-purple-800 shadow-sm">
            <p>Template Editor</p>
          </div>
        ) : (
          <div className="mb-4 mt-2 flex h-10 w-full items-center rounded-lg bg-white px-4 shadow-sm transition-all focus-within:ring-2 focus-within:ring-purple-400 hover:shadow-md">
            <EditIcon className="mr-3 h-5 w-5 text-gray-500" />
            <input
              type="text"
              value={
                name ||
                `${viewMode === "results" ? "Results" : "Question"} ${viewMode === "results" ? resultIndex + 1 : index + 1}`
              }
              onChange={(e) => {
                updatePage(viewMode, { name: e.target.value });
              }}
              className="h-full w-full bg-transparent text-lg font-semibold text-gray-800 placeholder-gray-400 focus:outline-none"
              placeholder={`${viewMode === "results" ? "Results" : "Question"} ${viewMode === "results" ? resultIndex + 1 : index + 1} Title`}
              aria-label={`Edit page title for ${viewMode === "results" ? "Results" : "Question"} ${viewMode === "results" ? resultIndex + 1 : index + 1}`}
            />
          </div>
        )}
        {/* Background Controls */}
        <BackgroundControls viewMode={viewMode} />
        <div className="w-full max-w-full py-6" ref={componentsAnimateRef}>
          {component && component.length > 0 ? (
            component.map((component, idx) => (
              <ComponentEditor
                component={component}
                path={[idx]}
                key={idx}
                viewMode={viewMode}
              />
            ))
          ) : (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 text-center text-purple-700 shadow-sm">
              <h3 className="mb-3 text-xl font-semibold">No Components Yet!</h3>
              <p className="mb-4">
                Start by adding{" "}
                {viewMode === "template"
                  ? "components"
                  : "a template or individual components"}{" "}
                to build your page.
              </p>
              {viewMode !== "template" && (
                <TemplateSelector
                  onSelect={handleTemplateSelect}
                  viewMode={viewMode}
                />
              )}
            </div>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 left-0 right-0 z-10 flex justify-center border-t border-gray-100 bg-gray-50 p-4 shadow-inner">
        <Popover
          open={componentPopoverOpen}
          onOpenChange={setComponentPopoverOpen}
        >
          <PopoverTrigger asChild>
            <Button
              className="flex items-center justify-center rounded-full bg-gradient-to-r from-[#57D4E1] to-[#9f7aea] px-6 py-3 text-white shadow-lg transition-all hover:shadow-xl"
              aria-label="Add new component"
            >
              <PlusIcon className="mr-2 h-5 w-5" />
              Add Component
            </Button>
          </PopoverTrigger>
          <PopoverContent className="animate-in fade-in-0 slide-in-from-bottom-2 mb-2 flex w-max min-w-[180px] flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            <h4 className="px-3 py-1 text-sm font-semibold text-gray-600">
              Component Types
            </h4>
            <Button
              onClick={() => handleAddComponent("FlexRowBox")}
              variant="ghost"
              className="justify-start text-base text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-1 focus:ring-blue-300"
            >
              <RowsIcon className="mr-3 h-5 w-5 text-blue-500" />
              Row Box
            </Button>
            <Button
              onClick={() => handleAddComponent("FlexColBox")}
              variant="ghost"
              className="justify-start text-base text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-1 focus:ring-blue-300"
            >
              <ColumnsIcon className="mr-3 h-5 w-5 text-green-500" />
              Column Box
            </Button>
            <Button
              onClick={() => handleAddComponent("image")}
              variant="ghost"
              className="justify-start text-base text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-1 focus:ring-blue-300"
            >
              <ImageIcon className="mr-3 h-5 w-5 text-purple-500" />
              Image
            </Button>
            <Button
              onClick={() => handleAddComponent("text")}
              variant="ghost"
              className="justify-start text-base text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-1 focus:ring-blue-300"
            >
              <TextIcon className="mr-3 h-5 w-5 text-red-500" />
              Text
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="min-h-[100px] flex-shrink-0" />
    </div>
  );
}
