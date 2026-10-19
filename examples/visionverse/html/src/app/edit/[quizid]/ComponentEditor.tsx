import React, { useContext, useState } from "react";
import { QuizContext } from "@/quizContext";
import { useTemplateContext } from "@/templateContext";
import { Button } from "@/components/ui/button";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus as PlusIcon,
  Rows as RowsIcon,
  Columns as ColumnsIcon,
  Image as ImageIcon,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type as TextIcon,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  Link,
  CircleCheck,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import type { Component, ComponentType, ViewMode, Action } from "@/types/types";
import SingleImageUpload from "@/components/SingleImageUpload";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ComponentEditor({
  component,
  path,
  viewMode,
}: {
  component: Component;
  path: number[];
  viewMode: ViewMode;
}) {
  // Always call all hooks unconditionally
  const quizContext = useContext(QuizContext);
  const templateContext = useTemplateContext();

  const [isExpanded, setIsExpanded] = useState(true);
  const [componentPopoverOpen, setComponentPopoverOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Auto-animate refs - use separate refs for different sections
  const [animateRef] = useAutoAnimate();
  const [childrenAnimateRef] = useAutoAnimate();

  // Select the appropriate context based on viewMode
  const context = viewMode === "template" ? templateContext : quizContext;

  if (!context) {
    return (
      <p className="p-4 text-red-500">
        {viewMode === "template" ? "Template" : "Quiz"} context not found.
      </p>
    );
  }

  const { updateComponent, deleteComponent, duplicateComponent, addComponent } =
    context;

  // Update text formatting - modify to update style property
  const updateStyles = (property: keyof React.CSSProperties, value: string) => {
    // Update the component with the new formatting
    updateComponent(viewMode, path, {
      style: { ...component.style, [property]: value },
    });
  };

  // Get component display name
  const getComponentName = () => {
    switch (component.type) {
      case "FlexRowBox":
        return "Row Box";
      case "FlexColBox":
        return "Column Box";
      case "AnswerBox":
        return "Answer Box";
      case "text":
        return "Text";
      case "image":
        return "Image";
      default:
        return "Component";
    }
  };

  // Get component index
  const getComponentIndex = (): number => {
    // Since path is a required parameter, this should never be undefined
    // @ts-expect-error - TypeScript doesn't know that path is defined
    return path.length > 0 ? path[path.length - 1] + 1 : 1;
  };

  return (
    <div
      className="mb-2 w-full rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
      ref={animateRef}
    >
      <div
        className="group flex h-10 w-full cursor-pointer items-center justify-between rounded-t-lg bg-gray-50 px-3 py-2"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button" // Indicate interactive element
        aria-expanded={isExpanded} // ARIA attribute for expand/collapse
        aria-controls={`component-controls-${path.join("-")}`} // Link to controlled content
        tabIndex={0} // Make focusable
        onKeyDown={(e) => {
          // Keyboard interaction
          if (e.key === "Enter" || e.key === " ") {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronDown className="mr-2 h-4 w-4 text-gray-600" />
          ) : (
            <ChevronRight className="mr-2 h-4 w-4 text-gray-600" />
          )}
          <span className="text-sm font-semibold text-gray-800">
            {getComponentName()} {getComponentIndex()}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Duplicate button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
            onClick={(e) => {
              e.stopPropagation(); // Prevent toggling expand
              duplicateComponent(viewMode, path);
            }}
            title="Duplicate Component"
            aria-label="Duplicate this component"
          >
            <Copy className="h-4 w-4" />
          </Button>

          {/* Delete button with confirmation dialog */}
          <Popover open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:bg-red-100 hover:text-red-700"
                title="Delete Component"
                aria-label="Delete this component"
                onClick={(e) => e.stopPropagation()} // Prevent toggling expand
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="z-50 w-auto rounded-md border border-gray-200 bg-white p-3 shadow-md">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete this{" "}
                  <span className="font-semibold">
                    {getComponentName().toLowerCase()}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 bg-red-600 px-4 text-sm text-white hover:bg-red-700"
                    onClick={() => {
                      deleteComponent(viewMode, path);
                      setDeleteConfirmOpen(false); // Close popover after delete
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isExpanded && (
        <div
          id={`component-controls-${path.join("-")}`}
          className="overflow-hidden rounded-b-lg bg-white p-4"
        >
          {/* Component-specific controls */}
          {(() => {
            switch (component.type) {
              case "text":
                return (
                  <div className="space-y-4">
                    <label
                      htmlFor={`text-input-${path.join("-")}`}
                      className="sr-only"
                    >
                      Enter text content
                    </label>
                    <Input
                      id={`text-input-${path.join("-")}`}
                      className="h-9 w-full rounded-md border border-gray-300 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter text content..."
                      value={component.data ?? ""}
                      onChange={(e) =>
                        updateComponent(viewMode, path, {
                          data: e.target.value,
                        })
                      }
                      aria-label="Text content"
                    />

                    {/* Text Formatting Controls */}
                    <div className="flex flex-col gap-4">
                      {/* Basic Formatting */}
                      <div className="flex items-center gap-3">
                        <span className="min-w-[50px] text-sm font-medium text-gray-700">
                          Format:
                        </span>
                        <ToggleGroup
                          type="multiple"
                          variant="outline"
                          className="justify-start rounded-md border border-gray-300"
                          aria-label="Text formatting options"
                        >
                          <ToggleGroupItem
                            value="bold"
                            aria-label="Toggle bold"
                            data-state={
                              component.style?.fontWeight === "bold"
                                ? "on"
                                : "off"
                            }
                            onClick={() =>
                              updateStyles(
                                "fontWeight",
                                component.style?.fontWeight === "bold"
                                  ? "normal"
                                  : "bold",
                              )
                            }
                            className={`h-9 w-9 p-0 text-gray-600 hover:bg-gray-100 ${component.style?.fontWeight === "bold" ? "border-blue-500 bg-blue-50 text-blue-700" : ""}`}
                          >
                            <BoldIcon className="h-4 w-4" />
                          </ToggleGroupItem>

                          <ToggleGroupItem
                            value="italic"
                            aria-label="Toggle italic"
                            data-state={
                              component.style?.fontStyle === "italic"
                                ? "on"
                                : "off"
                            }
                            onClick={() =>
                              updateStyles(
                                "fontStyle",
                                component.style?.fontStyle === "italic"
                                  ? "normal"
                                  : "italic",
                              )
                            }
                            className={`h-9 w-9 p-0 text-gray-600 hover:bg-gray-100 ${component.style?.fontStyle === "italic" ? "border-blue-500 bg-blue-50 text-blue-700" : ""}`}
                          >
                            <ItalicIcon className="h-4 w-4" />
                          </ToggleGroupItem>

                          <ToggleGroupItem
                            value="underline"
                            aria-label="Toggle underline"
                            data-state={
                              component.style?.textDecoration === "underline"
                                ? "on"
                                : "off"
                            }
                            onClick={() =>
                              updateStyles(
                                "textDecoration",
                                component.style?.textDecoration === "underline"
                                  ? "none"
                                  : "underline",
                              )
                            }
                            className={`h-9 w-9 p-0 text-gray-600 hover:bg-gray-100 ${component.style?.textDecoration === "underline" ? "border-blue-500 bg-blue-50 text-blue-700" : ""}`}
                          >
                            <UnderlineIcon className="h-4 w-4" />
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      {/* Text Alignment */}
                      <div className="flex items-center gap-3">
                        <span className="min-w-[50px] text-sm font-medium text-gray-700">
                          Align:
                        </span>
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          className="justify-start rounded-md border border-gray-300"
                          aria-label="Text alignment options"
                        >
                          <ToggleGroupItem
                            value="left"
                            aria-label="Align text left"
                            onClick={() => updateStyles("textAlign", "left")}
                            className={`h-9 w-9 p-0 text-gray-600 hover:bg-gray-100 ${component.style?.textAlign === "left" ? "border-blue-500 bg-blue-50 text-blue-700" : ""}`}
                          >
                            <AlignLeft className="h-4 w-4" />
                          </ToggleGroupItem>

                          <ToggleGroupItem
                            value="center"
                            aria-label="Align text center"
                            onClick={() => updateStyles("textAlign", "center")}
                            className={`h-9 w-9 p-0 text-gray-600 hover:bg-gray-100 ${component.style?.textAlign === "center" ? "border-blue-500 bg-blue-50 text-blue-700" : ""}`}
                          >
                            <AlignCenter className="h-4 w-4" />
                          </ToggleGroupItem>

                          <ToggleGroupItem
                            value="right"
                            aria-label="Align text right"
                            onClick={() => updateStyles("textAlign", "right")}
                            className={`h-9 w-9 p-0 text-gray-600 hover:bg-gray-100 ${component.style?.textAlign === "right" ? "border-blue-500 bg-blue-50 text-blue-700" : ""}`}
                          >
                            <AlignRight className="h-4 w-4" />
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      {/* Text Size */}
                      <div className="flex items-center gap-3">
                        <label
                          htmlFor={`font-size-input-${path.join("-")}`}
                          className="min-w-[50px] text-sm font-medium text-gray-700"
                        >
                          Size:
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`font-size-input-${path.join("-")}`}
                            type="number"
                            className="h-9 w-20 rounded-md border border-gray-300 text-sm"
                            placeholder="1"
                            value={
                              typeof component.style?.fontSize === "string"
                                ? (() => {
                                    const v = parseFloat(
                                      component.style.fontSize.replace(
                                        "rem",
                                        "",
                                      ),
                                    );
                                    return isNaN(v) ? "" : v;
                                  })()
                                : component.style?.fontSize !== undefined &&
                                    !isNaN(Number(component.style?.fontSize))
                                  ? component.style?.fontSize
                                  : ""
                            }
                            onChange={(e) =>
                              updateStyles(
                                "fontSize",
                                e.target.value ? `${e.target.value}rem` : "",
                              )
                            }
                            min="0.5"
                            step="0.1"
                            aria-label="Font size in rem"
                          />
                          <span className="text-sm text-gray-500">rem</span>
                        </div>
                      </div>

                      {/* Text Color */}
                      <div className="flex items-center gap-3">
                        <span className="min-w-[50px] text-sm font-medium text-gray-700">
                          Color:
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-9 w-12 rounded-md border border-gray-300 p-0 shadow-sm"
                              style={{
                                backgroundColor:
                                  component.style?.color ?? "#000000",
                              }}
                              aria-label="Text color picker"
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                            <HexColorPicker
                              color={component.style?.color ?? "#000000"}
                              onChange={(color) => updateStyles("color", color)}
                            />
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <span className="font-mono text-sm text-gray-700">
                                {component.style?.color ?? "#000000"}
                              </span>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                );
              case "image":
                return (
                  <div className="space-y-4">
                    <SingleImageUpload
                      viewMode={viewMode}
                      uploadPath={path}
                      image={component.data}
                    />
                  </div>
                );
              case "FlexRowBox":
              case "FlexColBox":
              case "AnswerBox": // Default controls for AnswerBox as well
                return (
                  <div className="pr-4">
                    <div ref={childrenAnimateRef}>
                      {/* Child components */}
                      {component.children && component.children.length > 0 ? (
                        <div className="mb-4 space-y-2">
                          {component.children.map(
                            (childComponent, childIndex) => (
                              <ComponentEditor
                                component={childComponent}
                                path={[...path, childIndex]}
                                key={childIndex}
                                viewMode={viewMode}
                              />
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="my-3 rounded-md border border-dashed border-gray-200 bg-gray-50 p-3 text-center text-sm italic text-gray-500">
                          No child components. Click &#34;Add Component&#34;
                          below to add some!
                        </div>
                      )}
                    </div>
                  </div>
                );
              default:
                return null;
            }
          })()}

          {/* Add Child Component Button (for container types) */}
          {(component.type === "FlexRowBox" ||
            component.type === "FlexColBox" ||
            component.type === "AnswerBox") && (
            <Popover
              open={componentPopoverOpen}
              onOpenChange={setComponentPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  className="mt-2 flex items-center justify-center rounded-full bg-gradient-to-r from-[#57D4E1] to-[#9f7aea] px-4 py-2 text-sm text-white shadow-md transition-all hover:shadow-lg"
                  aria-label={`Add new component to ${getComponentName()}`}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Component
                </Button>
              </PopoverTrigger>
              <PopoverContent className="animate-in fade-in-0 slide-in-from-bottom-2 z-50 flex w-max min-w-[180px] flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                <h4 className="px-3 py-1 text-xs font-semibold text-gray-600">
                  Component Types
                </h4>
                <Button
                  onClick={() => addComponent(viewMode, "FlexRowBox", path)}
                  variant="ghost"
                  className="justify-start text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-1 focus:ring-blue-300"
                >
                  <RowsIcon className="mr-2 h-4 w-4 text-blue-500" />
                  Row Box
                </Button>
                <Button
                  onClick={() => addComponent(viewMode, "FlexColBox", path)}
                  variant="ghost"
                  className="justify-start text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-1 focus:ring-blue-300"
                >
                  <ColumnsIcon className="mr-2 h-4 w-4 text-green-500" />
                  Column Box
                </Button>
                <Button
                  onClick={() => addComponent(viewMode, "text", path)}
                  variant="ghost"
                  className="justify-start text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-1 focus:ring-blue-300"
                >
                  <TextIcon className="mr-2 h-4 w-4 text-red-500" />
                  Text
                </Button>
                <Button
                  onClick={() => addComponent(viewMode, "image", path)}
                  variant="ghost"
                  className="justify-start text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-1 focus:ring-blue-300"
                >
                  <ImageIcon className="mr-2 h-4 w-4 text-purple-500" />
                  Image
                </Button>
              </PopoverContent>
            </Popover>
          )}
          <DefaultControl
            component={component}
            path={path}
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );
}

function DefaultControl({
  component,
  path,
  viewMode,
}: {
  component: Component;
  path: number[];
  viewMode: ViewMode;
}) {
  // Always call all hooks unconditionally
  const quizContext = useContext(QuizContext);
  const templateContext = useTemplateContext();

  const [paddingUnit, setPaddingUnit] = useState("px");
  const [marginUnit, setMarginUnit] = useState("px");
  const [sizeUnit, setSizeUnit] = useState("px");

  // Section visibility states - all expanded by default
  const [showBackground, setShowBackground] = useState(true);
  const [showBorder, setShowBorder] = useState(true);
  const [showPadding, setShowPadding] = useState(true);
  const [showMargin, setShowMargin] = useState(true);
  const [showSize, setShowSize] = useState(true);
  const [showActions, setShowActions] = useState(true);

  // Select the appropriate context based on viewMode
  const context = viewMode === "template" ? templateContext : quizContext;

  if (!context) {
    return (
      <p className="p-4 text-red-500">
        {viewMode === "template" ? "Template" : "Quiz"} context not found.
      </p>
    );
  }

  const { updateComponent, results } = context;

  // Update text formatting - modify to update style property
  const updateStyles = (property: keyof React.CSSProperties, value: string) => {
    // Update the component with the new formatting
    updateComponent(viewMode, path, {
      style: { ...component.style, [property]: value },
    });
  };

  // Add a new function to handle action updates
  const updateAction = (
    actionType:
      | "previousPage"
      | "nextPage"
      | "redirect"
      | "answer"
      | "startQuiz"
      | null,
    url?: string,
    score?: string,
    selectedOption?: string,
  ) => {
    let newAction: Action | undefined = undefined;

    if (actionType === "previousPage") {
      newAction = { type: "previousPage" };
    } else if (actionType === "nextPage") {
      newAction = { type: "nextPage" };
    } else if (actionType === "redirect" && url) {
      newAction = { type: "redirect", url };
    } else if (actionType === "startQuiz") {
      newAction = { type: "startQuiz" };
    } else if (actionType === "answer") {
      // Get existing score if available
      let existingScore = 0;
      if (
        component.action?.type === "answer" &&
        component.action.score !== undefined
      ) {
        existingScore = component.action.score;
      }

      // Get an existing selectedOption if available
      let existingSelectedOption = "";
      if (
        component.action?.type === "answer" &&
        component.action.selectedOption !== undefined
      ) {
        existingSelectedOption = component.action.selectedOption;
      }

      newAction = {
        type: "answer",
        score: score ? parseInt(score) : existingScore,
        selectedOption: selectedOption ?? existingSelectedOption,
      };
    }

    updateComponent(viewMode, path, { action: newAction });
  };

  const renderToggleHeader = (
    label: string,
    isExpanded: boolean,
    toggleFn: () => void,
  ) => (
    <button
      className="-ml-2 flex w-full items-center rounded-md px-2 py-2 text-left text-sm font-semibold text-gray-700 transition-colors hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
      onClick={toggleFn}
      aria-expanded={isExpanded}
      aria-controls={`controls-panel-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      {isExpanded ? (
        <ChevronDown className="mr-2 h-4 w-4 text-blue-500" />
      ) : (
        <ChevronRight className="mr-2 h-4 w-4 text-blue-500" />
      )}
      {label}
    </button>
  );

  const renderUnitToggle = (unit: string, setUnit: (unit: string) => void) => (
    <Button
      variant="outline"
      size="sm"
      className="h-8 w-12 border-gray-300 text-xs text-gray-600 hover:bg-gray-100 hover:text-blue-700 focus:ring-1 focus:ring-blue-300"
      onClick={() => setUnit(unit === "px" ? "%" : "px")}
      aria-label={`Toggle unit between pixels and percentage. Current unit: ${unit}`}
    >
      {unit}
    </Button>
  );

  const commonInputClasses =
    "h-9 w-20 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const commonLabelClasses = "w-16 text-sm text-gray-700 font-medium";

  return (
    <div className="mt-4 space-y-4">
      {" "}
      {/* Increased spacing for better visual flow */}
      {/* Background Color Control */}
      <div className="border-t border-gray-200 pt-4">
        {renderToggleHeader("Background", showBackground, () =>
          setShowBackground(!showBackground),
        )}
        {showBackground && (
          <div
            id="controls-panel-background"
            className="ml-4 mt-3 flex items-center gap-3"
          >
            <span className={commonLabelClasses}>Color:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-12 rounded-md border border-gray-300 p-0 shadow-sm"
                  style={{
                    backgroundColor:
                      component.style?.backgroundColor ?? "transparent",
                  }}
                  aria-label="Background color picker"
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                <HexColorPicker
                  color={component.style?.backgroundColor ?? "transparent"}
                  onChange={(color) => updateStyles("backgroundColor", color)}
                />
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="font-mono text-sm text-gray-700">
                    {component.style?.backgroundColor ?? "transparent"}
                  </span>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
      {/* Border Controls */}
      <div className="border-t border-gray-200 pt-4">
        {renderToggleHeader("Border", showBorder, () =>
          setShowBorder(!showBorder),
        )}
        {showBorder && (
          <div id="controls-panel-border" className="ml-4 mt-3 space-y-3">
            {/* Border Width */}
            <div className="flex items-center gap-3">
              <label
                htmlFor={`border-width-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Width:
              </label>
              <Input
                id={`border-width-${path.join("-")}`}
                type="number"
                className={commonInputClasses}
                placeholder="0"
                value={
                  typeof component.style?.borderWidth === "string"
                    ? (() => {
                        const v = parseFloat(
                          component.style.borderWidth.replace("px", ""),
                        );
                        return isNaN(v) ? "" : v;
                      })()
                    : component.style?.borderWidth !== undefined &&
                        !isNaN(Number(component.style?.borderWidth))
                      ? component.style?.borderWidth
                      : ""
                }
                onChange={(e) =>
                  updateStyles(
                    "borderWidth",
                    e.target.value ? `${e.target.value}px` : "",
                  )
                }
                min="0"
                aria-label="Border width in pixels"
              />
              <span className="text-sm text-gray-500">px</span>
            </div>

            {/* Border Style */}
            <div className="flex items-center gap-3">
              <label
                htmlFor={`border-style-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Style:
              </label>
              <Select
                value={component.style?.borderStyle?.toString() ?? "none"}
                onValueChange={(value) => updateStyles("borderStyle", value)}
              >
                <SelectTrigger
                  id={`border-style-${path.join("-")}`}
                  className="h-9 w-32 rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="rounded-md border border-gray-200 bg-white shadow-md">
                  <SelectItem value="none" className="text-sm">
                    None
                  </SelectItem>
                  <SelectItem value="solid" className="text-sm">
                    Solid
                  </SelectItem>
                  <SelectItem value="dashed" className="text-sm">
                    Dashed
                  </SelectItem>
                  <SelectItem value="dotted" className="text-sm">
                    Dotted
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Border Color */}
            <div className="flex items-center gap-3">
              <span className={commonLabelClasses}>Color:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-12 rounded-md border border-gray-300 p-0 shadow-sm"
                    style={{
                      backgroundColor:
                        component.style?.borderColor ?? "#000000",
                    }}
                    aria-label="Border color picker"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                  <HexColorPicker
                    color={component.style?.borderColor ?? "#000000"}
                    onChange={(color) => updateStyles("borderColor", color)}
                  />
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="font-mono text-sm text-gray-700">
                      {component.style?.borderColor ?? "#000000"}
                    </span>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Border Radius */}
            <div className="flex items-center gap-3">
              <label
                htmlFor={`border-radius-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Radius:
              </label>
              <Input
                id={`border-radius-${path.join("-")}`}
                type="number"
                className={commonInputClasses}
                placeholder="0"
                value={
                  typeof component.style?.borderRadius === "string"
                    ? (() => {
                        const v = parseFloat(
                          component.style.borderRadius.replace("px", ""),
                        );
                        return isNaN(v) ? "" : v;
                      })()
                    : component.style?.borderRadius !== undefined &&
                        !isNaN(Number(component.style?.borderRadius))
                      ? component.style?.borderRadius
                      : ""
                }
                onChange={(e) =>
                  updateStyles(
                    "borderRadius",
                    e.target.value ? `${e.target.value}px` : "",
                  )
                }
                min="0"
                aria-label="Border radius in pixels"
              />
              <span className="text-sm text-gray-500">px</span>
            </div>
          </div>
        )}
      </div>
      {/* Padding Controls */}
      <div className="border-t border-gray-200 pt-4">
        {renderToggleHeader("Padding", showPadding, () =>
          setShowPadding(!showPadding),
        )}
        {showPadding && (
          <div
            id="controls-panel-padding"
            className="ml-4 mt-3 grid grid-cols-2 gap-3"
          >
            <div className="flex items-center gap-3">
              <label
                htmlFor={`padding-top-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Top:
              </label>
              <Input
                id={`padding-top-${path.join("-")}`}
                type="number"
                className={commonInputClasses}
                placeholder="0"
                value={
                  typeof component.style?.paddingTop === "string"
                    ? (() => {
                        const v = parseFloat(
                          component.style.paddingTop
                            .replace("px", "")
                            .replace("%", ""),
                        );
                        return isNaN(v) ? "" : v;
                      })()
                    : component.style?.paddingTop !== undefined &&
                        !isNaN(Number(component.style?.paddingTop))
                      ? component.style?.paddingTop
                      : ""
                }
                onChange={(e) =>
                  updateStyles(
                    "paddingTop",
                    e.target.value ? e.target.value + paddingUnit : "",
                  )
                }
                min="0"
                aria-label={`Padding top in ${paddingUnit}`}
              />
              {renderUnitToggle(paddingUnit, setPaddingUnit)}
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor={`padding-right-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Right:
              </label>
              <Input
                id={`padding-right-${path.join("-")}`}
                type="number"
                className={commonInputClasses}
                placeholder="0"
                value={
                  typeof component.style?.paddingRight === "string"
                    ? (() => {
                        const v = parseFloat(
                          component.style.paddingRight
                            .replace("px", "")
                            .replace("%", ""),
                        );
                        return isNaN(v) ? "" : v;
                      })()
                    : component.style?.paddingRight !== undefined &&
                        !isNaN(Number(component.style?.paddingRight))
                      ? component.style?.paddingRight
                      : ""
                }
                onChange={(e) =>
                  updateStyles(
                    "paddingRight",
                    e.target.value ? e.target.value + paddingUnit : "",
                  )
                }
                min="0"
                aria-label={`Padding right in ${paddingUnit}`}
              />
              {renderUnitToggle(paddingUnit, setPaddingUnit)}
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor={`padding-bottom-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Bottom:
              </label>
              <Input
                id={`padding-bottom-${path.join("-")}`}
                type="number"
                className={commonInputClasses}
                placeholder="0"
                value={
                  typeof component.style?.paddingBottom === "string"
                    ? (() => {
                        const v = parseFloat(
                          component.style.paddingBottom
                            .replace("px", "")
                            .replace("%", ""),
                        );
                        return isNaN(v) ? "" : v;
                      })()
                    : component.style?.paddingBottom !== undefined &&
                        !isNaN(Number(component.style?.paddingBottom))
                      ? component.style?.paddingBottom
                      : ""
                }
                onChange={(e) =>
                  updateStyles(
                    "paddingBottom",
                    e.target.value ? e.target.value + paddingUnit : "",
                  )
                }
                min="0"
                aria-label={`Padding bottom in ${paddingUnit}`}
              />
              {renderUnitToggle(paddingUnit, setPaddingUnit)}
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor={`padding-left-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Left:
              </label>
              <Input
                id={`padding-left-${path.join("-")}`}
                type="number"
                className={commonInputClasses}
                placeholder="0"
                value={
                  typeof component.style?.paddingLeft === "string"
                    ? (() => {
                        const v = parseFloat(
                          component.style.paddingLeft
                            .replace("px", "")
                            .replace("%", ""),
                        );
                        return isNaN(v) ? "" : v;
                      })()
                    : component.style?.paddingLeft !== undefined &&
                        !isNaN(Number(component.style?.paddingLeft))
                      ? component.style?.paddingLeft
                      : ""
                }
                onChange={(e) =>
                  updateStyles(
                    "paddingLeft",
                    e.target.value ? e.target.value + paddingUnit : "",
                  )
                }
                min="0"
                aria-label={`Padding left in ${paddingUnit}`}
              />
              {renderUnitToggle(paddingUnit, setPaddingUnit)}
            </div>
          </div>
        )}
      </div>
      {/* Margin Controls */}
      <div className="border-t border-gray-200 pt-4">
        {renderToggleHeader("Margin", showMargin, () =>
          setShowMargin(!showMargin),
        )}
        {showMargin && (
          <div
            id="controls-panel-margin"
            className="ml-4 mt-3 grid grid-cols-2 gap-3"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`margin-top-${path.join("-")}`}
                  className="text-sm font-medium text-gray-700"
                >
                  Top:
                </label>
                <Button
                  variant={
                    component.style?.marginTop === "auto"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className={`h-8 rounded-md px-3 text-xs ${component.style?.marginTop === "auto" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                  onClick={() =>
                    updateStyles(
                      "marginTop",
                      component.style?.marginTop === "auto" ? "" : "auto",
                    )
                  }
                  aria-pressed={component.style?.marginTop === "auto"}
                  aria-label="Toggle margin top auto"
                >
                  Auto
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id={`margin-top-${path.join("-")}`}
                  type="number"
                  className={commonInputClasses}
                  placeholder="0"
                  disabled={component.style?.marginTop === "auto"}
                  value={
                    typeof component.style?.marginTop === "string" &&
                    component.style?.marginTop !== "auto"
                      ? (() => {
                          const v = parseFloat(
                            component.style.marginTop
                              .replace("px", "")
                              .replace("%", ""),
                          );
                          return isNaN(v) ? "" : v;
                        })()
                      : component.style?.marginTop === "auto"
                        ? ""
                        : component.style?.marginTop !== undefined &&
                            !isNaN(Number(component.style?.marginTop))
                          ? component.style?.marginTop
                          : ""
                  }
                  onChange={(e) =>
                    updateStyles(
                      "marginTop",
                      e.target.value ? e.target.value + marginUnit : "",
                    )
                  }
                  min="0"
                  aria-label={`Margin top in ${marginUnit}`}
                />
                {renderUnitToggle(marginUnit, setMarginUnit)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`margin-right-${path.join("-")}`}
                  className="text-sm font-medium text-gray-700"
                >
                  Right:
                </label>
                <Button
                  variant={
                    component.style?.marginRight === "auto"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className={`h-8 rounded-md px-3 text-xs ${component.style?.marginRight === "auto" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                  onClick={() =>
                    updateStyles(
                      "marginRight",
                      component.style?.marginRight === "auto" ? "" : "auto",
                    )
                  }
                  aria-pressed={component.style?.marginRight === "auto"}
                  aria-label="Toggle margin right auto"
                >
                  Auto
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id={`margin-right-${path.join("-")}`}
                  type="number"
                  className={commonInputClasses}
                  placeholder="0"
                  disabled={component.style?.marginRight === "auto"}
                  value={
                    typeof component.style?.marginRight === "string" &&
                    component.style?.marginRight !== "auto"
                      ? (() => {
                          const v = parseFloat(
                            component.style.marginRight
                              .replace("px", "")
                              .replace("%", ""),
                          );
                          return isNaN(v) ? "" : v;
                        })()
                      : component.style?.marginRight === "auto"
                        ? ""
                        : component.style?.marginRight !== undefined &&
                            !isNaN(Number(component.style?.marginRight))
                          ? component.style?.marginRight
                          : ""
                  }
                  onChange={(e) =>
                    updateStyles(
                      "marginRight",
                      e.target.value ? e.target.value + marginUnit : "",
                    )
                  }
                  min="0"
                  aria-label={`Margin right in ${marginUnit}`}
                />
                {renderUnitToggle(marginUnit, setMarginUnit)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`margin-bottom-${path.join("-")}`}
                  className="text-sm font-medium text-gray-700"
                >
                  Bottom:
                </label>
                <Button
                  variant={
                    component.style?.marginBottom === "auto"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className={`h-8 rounded-md px-3 text-xs ${component.style?.marginBottom === "auto" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                  onClick={() =>
                    updateStyles(
                      "marginBottom",
                      component.style?.marginBottom === "auto" ? "" : "auto",
                    )
                  }
                  aria-pressed={component.style?.marginBottom === "auto"}
                  aria-label="Toggle margin bottom auto"
                >
                  Auto
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id={`margin-bottom-${path.join("-")}`}
                  type="number"
                  className={commonInputClasses}
                  placeholder="0"
                  disabled={component.style?.marginBottom === "auto"}
                  value={
                    typeof component.style?.marginBottom === "string" &&
                    component.style?.marginBottom !== "auto"
                      ? (() => {
                          const v = parseFloat(
                            component.style.marginBottom
                              .replace("px", "")
                              .replace("%", ""),
                          );
                          return isNaN(v) ? "" : v;
                        })()
                      : component.style?.marginBottom === "auto"
                        ? ""
                        : component.style?.marginBottom !== undefined &&
                            !isNaN(Number(component.style?.marginBottom))
                          ? component.style?.marginBottom
                          : ""
                  }
                  onChange={(e) =>
                    updateStyles(
                      "marginBottom",
                      e.target.value ? e.target.value + marginUnit : "",
                    )
                  }
                  min="0"
                  aria-label={`Margin bottom in ${marginUnit}`}
                />
                {renderUnitToggle(marginUnit, setMarginUnit)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`margin-left-${path.join("-")}`}
                  className="text-sm font-medium text-gray-700"
                >
                  Left:
                </label>
                <Button
                  variant={
                    component.style?.marginLeft === "auto"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className={`h-8 rounded-md px-3 text-xs ${component.style?.marginLeft === "auto" ? "bg-blue-500 text-white hover:bg-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                  onClick={() =>
                    updateStyles(
                      "marginLeft",
                      component.style?.marginLeft === "auto" ? "" : "auto",
                    )
                  }
                  aria-pressed={component.style?.marginLeft === "auto"}
                  aria-label="Toggle margin left auto"
                >
                  Auto
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id={`margin-left-${path.join("-")}`}
                  type="number"
                  className={commonInputClasses}
                  placeholder="0"
                  disabled={component.style?.marginLeft === "auto"}
                  value={
                    typeof component.style?.marginLeft === "string" &&
                    component.style?.marginLeft !== "auto"
                      ? (() => {
                          const v = parseFloat(
                            component.style.marginLeft
                              .replace("px", "")
                              .replace("%", ""),
                          );
                          return isNaN(v) ? "" : v;
                        })()
                      : component.style?.marginLeft === "auto"
                        ? ""
                        : component.style?.marginLeft !== undefined &&
                            !isNaN(Number(component.style?.marginLeft))
                          ? component.style?.marginLeft
                          : ""
                  }
                  onChange={(e) =>
                    updateStyles(
                      "marginLeft",
                      e.target.value ? e.target.value + marginUnit : "",
                    )
                  }
                  min="0"
                  aria-label={`Margin left in ${marginUnit}`}
                />
                {renderUnitToggle(marginUnit, setMarginUnit)}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Size Controls */}
      <div className="border-t border-gray-200 pt-4">
        {renderToggleHeader("Size", showSize, () => setShowSize(!showSize))}
        {showSize && (
          <div
            id="controls-panel-size"
            className="ml-4 mt-3 grid grid-cols-2 gap-3"
          >
            <div className="flex items-center gap-3">
              <label
                htmlFor={`width-input-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Width:
              </label>
              <Input
                id={`width-input-${path.join("-")}`}
                type="number"
                className={commonInputClasses}
                placeholder="auto"
                value={
                  typeof component.style?.width === "string"
                    ? (() => {
                        const v = parseFloat(
                          component.style.width
                            .replace("px", "")
                            .replace("%", ""),
                        );
                        return isNaN(v) ? "" : v;
                      })()
                    : component.style?.width !== undefined &&
                        !isNaN(Number(component.style?.width))
                      ? component.style?.width
                      : ""
                }
                onChange={(e) =>
                  updateStyles(
                    "width",
                    e.target.value ? e.target.value + sizeUnit : "",
                  )
                }
                min="0"
                aria-label={`Component width in ${sizeUnit}`}
              />
              {renderUnitToggle(sizeUnit, setSizeUnit)}
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor={`height-input-${path.join("-")}`}
                className={commonLabelClasses}
              >
                Height:
              </label>
              <Input
                id={`height-input-${path.join("-")}`}
                type="number"
                className={commonInputClasses}
                placeholder="auto"
                value={
                  typeof component.style?.height === "string"
                    ? (() => {
                        const v = parseFloat(
                          component.style.height
                            .replace("px", "")
                            .replace("%", ""),
                        );
                        return isNaN(v) ? "" : v;
                      })()
                    : component.style?.height !== undefined &&
                        !isNaN(Number(component.style?.height))
                      ? component.style?.height
                      : ""
                }
                onChange={(e) =>
                  updateStyles(
                    "height",
                    e.target.value ? e.target.value + sizeUnit : "",
                  )
                }
                min="0"
                aria-label={`Component height in ${sizeUnit}`}
              />
              {renderUnitToggle(sizeUnit, setSizeUnit)}
            </div>
          </div>
        )}
      </div>
      {/* Action Controls */}
      <div className="border-t border-gray-200 pt-4">
        {renderToggleHeader("Actions", showActions, () =>
          setShowActions(!showActions),
        )}
        {showActions && (
          <div id="controls-panel-actions" className="ml-4 mt-3 space-y-3">
            <Select
              value={component.action?.type ?? "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  updateAction(null);
                } else if (value === "previousPage") {
                  updateAction("previousPage");
                } else if (value === "nextPage") {
                  updateAction("nextPage");
                } else if (value === "redirect") {
                  updateAction(
                    "redirect",
                    component.action && component.action.type === "redirect"
                      ? component.action.url
                      : "https://",
                  );
                } else if (value === "answer") {
                  // Set default result if available
                  const defaultOption =
                    results && results.length > 0
                      ? (results[0]?.name ?? "Result 1")
                      : "";
                  updateAction("answer", undefined, "0", defaultOption);
                } else if (value === "startQuiz") {
                  updateAction("startQuiz");
                }
              }}
            >
              <SelectTrigger
                className="h-9 w-full rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                aria-label="Select action type"
              >
                <SelectValue placeholder="Select action..." />
              </SelectTrigger>
              <SelectContent className="rounded-md border border-gray-200 bg-white shadow-md">
                <SelectItem value="none" className="text-sm">
                  No Action
                </SelectItem>
                <SelectItem value="previousPage" className="text-sm">
                  <div className="flex items-center">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous Page
                  </div>
                </SelectItem>
                <SelectItem value="nextPage" className="text-sm">
                  <div className="flex items-center">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Next Page
                  </div>
                </SelectItem>
                <SelectItem value="redirect" className="text-sm">
                  <div className="flex items-center">
                    <Link className="mr-2 h-4 w-4" />
                    Redirect to URL
                  </div>
                </SelectItem>
                <SelectItem value="answer" className="text-sm">
                  <div className="flex items-center">
                    <CircleCheck className="mr-2 h-4 w-4" />
                    Answer
                  </div>
                </SelectItem>
                <SelectItem value="startQuiz" className="text-sm">
                  <div className="flex items-center">
                    <Play className="mr-2 h-4 w-4" />
                    Start Quiz
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {component.action?.type === "redirect" && (
              <div className="mt-1">
                <label
                  htmlFor={`redirect-url-${path.join("-")}`}
                  className="sr-only"
                >
                  Enter Redirect URL
                </label>
                <Input
                  id={`redirect-url-${path.join("-")}`}
                  value={
                    component.action && component.action.type === "redirect"
                      ? component.action.url
                      : ""
                  }
                  onChange={(e) => updateAction("redirect", e.target.value)}
                  placeholder="Enter URL (e.g., https://example.com)"
                  className="h-9 rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  aria-label="Redirect URL"
                />
              </div>
            )}
            {component.action?.type === "answer" && (
              <div className="mt-1 flex flex-col gap-3">
                {" "}
                {/* Changed to flex-col for better stacking on smaller screens */}
                <div>
                  <label
                    htmlFor={`answer-result-${path.join("-")}`}
                    className="sr-only"
                  >
                    Select Result
                  </label>
                  <Select
                    value={
                      component.action?.type === "answer" &&
                      component.action.selectedOption
                        ? component.action.selectedOption
                        : results && results.length > 0
                          ? (results[0]?.name ?? "Result 1")
                          : ""
                    }
                    onValueChange={(value) =>
                      updateAction(
                        "answer",
                        undefined,
                        component.action?.type === "answer"
                          ? component.action.score?.toString()
                          : undefined,
                        value,
                      )
                    }
                  >
                    <SelectTrigger
                      id={`answer-result-${path.join("-")}`}
                      className="h-9 w-full rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      aria-label="Select result to link to"
                    >
                      <SelectValue placeholder="Select a result" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md border border-gray-200 bg-white shadow-md">
                      {results && results.length > 0 ? (
                        results.map((result, idx) => (
                          <SelectItem
                            key={idx}
                            value={result.name ?? `Result ${idx + 1}`}
                            className="text-sm"
                          >
                            {result.name ?? `Result ${idx + 1}`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="Result 1" className="text-sm">
                          Result 1
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    htmlFor={`answer-score-${path.join("-")}`}
                    className="sr-only"
                  >
                    Enter Score Value
                  </label>
                  <Input
                    id={`answer-score-${path.join("-")}`}
                    type="number"
                    value={
                      component.action?.type === "answer"
                        ? component.action.score !== undefined &&
                          !isNaN(Number(component.action.score))
                          ? component.action.score
                          : ""
                        : ""
                    }
                    onChange={(e) =>
                      updateAction(
                        "answer",
                        undefined,
                        e.target.value,
                        component.action?.type === "answer"
                          ? component.action.selectedOption
                          : undefined,
                      )
                    }
                    className="h-9 w-full rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter score value"
                    aria-label="Answer score value"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
