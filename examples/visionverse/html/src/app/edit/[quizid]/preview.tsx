import { useContext, useState, useEffect, useRef } from "react";
import { QuizContext } from "@/quizContext";
import { useTemplateContext } from "@/templateContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Renderer from "@/components/renderers/Renderer";
import { type ViewMode, type Page } from "@/types/types";
import clsx from "clsx";

// Popular phone models with their dimensions
const PHONE_MODELS = [
  { name: "iPhone 15 Pro", width: 393, height: 852 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "Samsung Galaxy S24", width: 384, height: 832 },
  { name: "Samsung Galaxy S23", width: 360, height: 780 },
  { name: "Google Pixel 8", width: 412, height: 915 },
] as const;

export default function Preview({
  viewMode,
  isPreviewFullscreen = false,
}: {
  viewMode: ViewMode;
  isPreviewFullscreen?: boolean;
}) {
  // Always call all hooks unconditionally
  const quizContext = useContext(QuizContext);
  const templateContext = useTemplateContext();

  const [pages, setPages] = useState<Page[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const startPositionRef = useRef({ x: 0, y: 0 });
  const startScaleRef = useRef(0.6);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [phoneHeight, setPhoneHeight] = useState(844);
  const [phoneWidth, setPhoneWidth] = useState(390);
  const [selectedPhoneModel, setSelectedPhoneModel] = useState("iPhone 14");

  // Use appropriate context based on viewMode
  const context = viewMode === "template" ? templateContext : quizContext;

  // Extract context values safely
  const onboard = context?.onboard;
  const results = context?.results;
  const pagesArray = context?.pages;
  const index = context?.index ?? 0;
  const resultIndex = context?.resultIndex ?? 0;
  const removePage = context?.removePage;
  const addPage = context?.addPage;
  const setIndex = context?.setIndex;
  const setResultIndex = context?.setResultIndex;

  useEffect(() => {
    if (!context) return;

    if (viewMode === "onboard" && onboard) {
      setPages([onboard]);
    } else if (viewMode === "results" && results) {
      setPages(results);
    } else if (viewMode === "template" && pagesArray) {
      setPages(pagesArray); // For template mode, use the pages from TemplateContext
    } else if (pagesArray) {
      setPages(pagesArray);
    }
  }, [viewMode, onboard, results, pagesArray, context]);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // Calculate delta from start position
    const deltaX = e.clientX - startPositionRef.current.x;
    const deltaY = e.clientY - startPositionRef.current.y;

    // Calculate new scale based on diagonal movement
    const scaleFactor = (deltaX + deltaY) * 0.0025;
    const newScale = Math.max(
      0.2,
      Math.min(1.5, startScaleRef.current + scaleFactor),
    );

    // Update DOM directly for smoother performance during drag
    if (previewRef.current && previewContentRef.current) {
      previewRef.current.style.width = `${phoneWidth * newScale}px`;
      previewRef.current.style.height = `${phoneHeight * newScale}px`;
      previewContentRef.current.style.transform = `scale(${newScale})`;
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    // When drag ends, update React state to match the current DOM values
    if (previewContentRef.current) {
      const transform = previewContentRef.current.style.transform;
      const scaleMatch = /scale\(([^)]+)\)/.exec(transform);
      if (scaleMatch?.[1]) {
        const newScale = parseFloat(scaleMatch[1]);
        setScale(newScale);
      }
    }

    setIsDragging(false);

    // Remove global event listeners
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Clean up event listeners when a component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Update scale when fullscreen mode changes
  useEffect(() => {
    setScale(isPreviewFullscreen ? 1.0 : 0.6);
  }, [isPreviewFullscreen]);

  if (!context) {
    return (
      <p className="p-4 text-red-500">
        {viewMode === "template" ? "Template" : "Quiz"} context not found.
      </p>
    );
  }

  const handleUpdateIndex = (index: number) => {
    if (viewMode === "edit" && setIndex) {
      setIndex(index);
    } else if (viewMode === "results" && setResultIndex) {
      setResultIndex(index);
    }
    // Note: template mode doesn't need index updates as it's single-page
  };

  // Function to handle adding a new page and automatically switch to it
  const handleAddPage = () => {
    if (!addPage) return;

    // Add the new page using the context function
    addPage(viewMode);

    // Set timeout to allow state update to happen before switching
    setTimeout(() => {
      // Switch to the newly added page (which will be the last one in the array)
      if (viewMode === "edit" && setIndex && pagesArray) {
        setIndex(pagesArray.length); // Will be the new index after adding
      } else if (viewMode === "results" && setResultIndex && results) {
        setResultIndex(results.length); // Will be the new index after adding
      }
    }, 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPositionRef.current = { x: e.clientX, y: e.clientY };
    startScaleRef.current = scale;

    // Add global event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex h-full w-full flex-row bg-gray-300">
      <div className="flex w-full flex-col items-center">
        {/* Phone Model Selector */}
        <div className="mb-2 mt-4">
          <Select
            value={selectedPhoneModel}
            onValueChange={(value) => {
              setSelectedPhoneModel(value);
              const selectedModel = PHONE_MODELS.find(
                (model) => model.name === value,
              );
              if (selectedModel) {
                setPhoneWidth(selectedModel.width);
                setPhoneHeight(selectedModel.height);
              }
            }}
          >
            <SelectTrigger className="w-48 border-gray-300 bg-white shadow-sm">
              <SelectValue placeholder="Select phone model" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {PHONE_MODELS.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  <div className="flex w-full items-center justify-between">
                    <span>{model.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {model.width}×{model.height}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          ref={previewRef}
          className={clsx(
            "relative flex flex-col",
            isPreviewFullscreen &&
              "fixed inset-0 z-50 m-0 flex items-center justify-center bg-gray-800 bg-opacity-90",
          )}
          style={{
            height: `${phoneHeight * scale}px`,
            width: `${phoneWidth * scale}px`,
          }}
        >
          <div
            ref={previewContentRef}
            className="origin-top-left transform"
            style={{
              transform: `scale(${scale})`,
            }}
          >
            <div
              className="relative overflow-hidden rounded-3xl"
              style={{
                height: `${phoneHeight}px`,
                width: `${phoneWidth}px`,
              }}
            >
              <Renderer
                page={pages[viewMode === "edit" ? index : resultIndex]!}
              />
            </div>
          </div>

          {/* Invisible resize handle - only shows the cursor */}
          <div
            className="absolute -bottom-2 -right-2 h-16 w-16 cursor-nwse-resize"
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          />
        </div>
      </div>
      {viewMode !== "onboard" && (
        <div className="m-4 flex h-max max-h-[90vh] w-max flex-col rounded-lg bg-white p-4">
          {pages.map((page, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  removePage?.(viewMode, i);
                }}
                className={clsx(
                  "flex h-3 w-1 items-center justify-center rounded-full",
                  "bg-red-500 text-sm font-bold text-white",
                  "transform transition-transform hover:scale-110 hover:bg-red-700",
                  pages.length <= 1 && "invisible",
                )}
                disabled={pages.length <= 1}
                title="Delete Question"
              >
                &times;
              </Button>
              <div
                className={clsx(
                  "relative h-[84px] w-[40px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border",
                  "transform transition duration-200 ease-in-out",
                  "border-gray-300 bg-white hover:scale-105 hover:shadow-md",
                  (viewMode === "edit" && index === i) ||
                    (viewMode === "results" && resultIndex === i)
                    ? "border-2 border-blue-600 ring-2 ring-blue-300"
                    : "border-gray-300",
                )}
                onClick={() => {
                  handleUpdateIndex(i);
                }}
                title={`Question ${i + 1}`}
              >
                <div className="pointer-events-none absolute inset-0 origin-top-left scale-[0.30] transform">
                  <div className="h-[250px] w-[230px] bg-white blur">
                    <Renderer page={page} />
                  </div>
                </div>
                <div className="absolute bottom-1 left-1 z-10 rounded bg-black bg-opacity-50 px-1 text-xs text-white">
                  {i + 1}
                </div>
              </div>
            </div>
          ))}
          <div className="flex flex-shrink-0 flex-col items-center gap-1">
            <div className="h-6 w-6"></div>
            <div
              onClick={handleAddPage}
              className={clsx(
                "flex h-[84px] w-auto flex-shrink-0 cursor-pointer flex-col items-center justify-center",
                "rounded-lg border-2 border-dashed border-blue-500",
                "bg-blue-50 transition-colors duration-200 hover:bg-blue-100",
              )}
              title="Add New Question"
            >
              <span className="text-md font-bold text-blue-500">+</span>
              <span className="w-16 px-2 text-center text-xs text-blue-500">
                Add <br /> {viewMode === "edit" ? "Question" : "Result"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
