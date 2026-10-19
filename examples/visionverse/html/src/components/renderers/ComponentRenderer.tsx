"use client";
import { type Component, type Action } from "@/types/types";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { PlayContext } from "@/playContext";
import { motion, AnimatePresence } from "framer-motion";

interface ComponentRendererProps {
  component: Component;
  isThumbnail?: boolean;
  scale?: number;
}

interface Style {
  fontSize?: string;
  padding?: string;
  margin?: string;
  width?: string;
  height?: string;
  borderRadius?: string | number;
  [key: string]: string | number | undefined;
}

export default function ComponentRenderer({
  component,
  isThumbnail = false,
  scale = 0.3,
}: ComponentRendererProps) {
  const router = useRouter();
  const playContext = useContext(PlayContext);

  // Helper function to extract content from component for saving
  const extractClickedContent = (component: Component): string => {
    switch (component.type) {
      case "text":
        return component.data ?? "Text component";
      case "image":
        return component.data ?? "Image placeholder";
      case "FlexRowBox":
      case "FlexColBox":
        // For flex boxes, try to extract text from children
        if (component.children && component.children.length > 0) {
          const textContents = component.children
            .map((child) => extractClickedContent(child))
            .filter(
              (content) =>
                content &&
                content !== "Text component" &&
                content !== "Image placeholder",
            )
            .join(" | ");
          return textContents || "Flex container";
        }
        return "Flex container";
      default:
        return "Unknown component";
    }
  };

  // Handle action clicks - disabled in thumbnail mode
  const handleActionClick = (action?: Action) => {
    if (isThumbnail || !action || !playContext) return;

    const {
      currentPageIndex,
      setCurrentPageIndex,
      updateResultScore,
      getHighestScoringResult,
      totalPages,
      startQuiz,
    } = playContext;

    switch (action.type) {
      case "startQuiz":
        startQuiz();
        break;
      case "nextPage":
        if (currentPageIndex < totalPages - 1) {
          setCurrentPageIndex(currentPageIndex + 1);
        }
        break;
      case "previousPage":
        if (currentPageIndex > 0) {
          setCurrentPageIndex(currentPageIndex - 1);
        }
        break;
      case "redirect":
        router.push(action.url);
        break;
      case "answer":
        // Extract the actual clicked content instead of using selectedOption
        const clickedContent = extractClickedContent(component);

        // Update the result score with the clicked content and score
        if (action.selectedOption && action.score !== undefined) {
          updateResultScore(
            action.selectedOption,
            action.score,
            clickedContent,
          );
        } else if (action.selectedOption !== undefined) {
          //defult to 0 temp fix for score not reg

          updateResultScore(action.selectedOption, 0, clickedContent);
        }

        // Move to next page or show result if this was the last question
        if (currentPageIndex < totalPages - 1) {
          setCurrentPageIndex(currentPageIndex + 1);
        } else {
          // Quiz completed, navigate to result page
          const highestResult = getHighestScoringResult();
          if (highestResult) {
            // You might want to navigate to a specific result page or show the result inline
            // For now, we'll just move to the next index which should trigger result display
            setCurrentPageIndex(currentPageIndex + 1);
          }
        }
        break;
    }
  };

  // Apply thumbnail styling modifications
  const getThumbnailStyle = (
    originalStyle: React.CSSProperties,
  ): React.CSSProperties => {
    if (!isThumbnail) return originalStyle;

    return {
      ...originalStyle,
      cursor: "default",
      fontSize:
        originalStyle?.fontSize !== undefined
          ? `${Math.max(
              0,
              parseFloat(
                originalStyle.fontSize.toString().replace(/[^\d.]/g, ""),
              ) * scale,
            )}px`
          : undefined,
      padding:
        originalStyle?.padding !== undefined
          ? `${parseFloat(originalStyle.padding.toString()) * scale}px`
          : undefined,
      margin:
        originalStyle?.margin !== undefined
          ? scaleMargin(originalStyle.margin.toString(), scale)
          : undefined,
      width:
        originalStyle?.width !== undefined
          ? scaleSize(originalStyle.width.toString(), scale)
          : undefined,
      height:
        originalStyle?.height !== undefined
          ? scaleSize(originalStyle.height.toString(), scale)
          : undefined,
      borderRadius:
        originalStyle?.borderRadius !== undefined
          ? `${parseFloat(originalStyle.borderRadius.toString()) * scale}px`
          : undefined,
    };
  };

  // Helper function to scale margin values
  const scaleMargin = (margin: string, scale: number): string => {
    if (margin.includes("auto")) {
      return margin.replace(
        /\d+px/g,
        (match) => `${parseFloat(match) * scale}px`,
      );
    }
    return `${parseFloat(margin) * scale}px`;
  };

  // Helper function to scale size values
  const scaleSize = (size: string, scale: number): string => {
    if (size.includes("%")) return size;
    return `${parseFloat(size) * scale}px`;
  };

  // Motion props - disabled in thumbnail mode
  const getMotionProps = () => {
    if (isThumbnail) {
      return {};
    }

    return {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.4, ease: "easeOut" },
      whileHover: { scale: 1.01 },
      whileTap: { scale: 0.98 },
    };
  };

  const getChildMotionProps = () => {
    if (isThumbnail) {
      return {};
    }

    return {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
      transition: { duration: 0.3, ease: "easeOut" },
      whileHover: { scale: 1.02 },
    };
  };

  switch (component.type) {
    case "text":
      return (
        <div
          style={getThumbnailStyle(component.style)}
          onClick={() => handleActionClick(component.action)}
          className={
            !isThumbnail && component.action
              ? "cursor-pointer hover:opacity-80"
              : ""
          }
        >
          {component.data ?? "Text component"}
        </div>
      );

    case "image":
      return (
        <div
          style={getThumbnailStyle(component.style)}
          onClick={() => handleActionClick(component.action)}
          className={
            !isThumbnail && component.action
              ? "cursor-pointer hover:opacity-80"
              : ""
          }
        >
          {component.data ? (
            <img
              src={component.data}
              alt="Uploaded"
              style={getThumbnailStyle(component.style)}
            />
          ) : (
            <div
              className="flex items-center justify-center bg-gray-200 text-gray-500"
              style={getThumbnailStyle(component.style)}
            >
              Image placeholder
            </div>
          )}
        </div>
      );

    case "FlexRowBox":
    case "FlexColBox":
      return (
        <motion.div
          style={getThumbnailStyle(component.style)}
          onClick={() => handleActionClick(component.action)}
          className={`${
            !isThumbnail && component.action
              ? "cursor-pointer hover:opacity-90"
              : ""
          } ${
            component.type === "FlexRowBox" ? "flex flex-row" : "flex flex-col"
          } gap-4 transition-all`}
          {...getMotionProps()}
        >
          <AnimatePresence mode="wait">
            {component.children && component.children.length > 0 ? (
              component.children.map((child, idx) => (
                <motion.div key={idx} {...getChildMotionProps()}>
                  <ComponentRenderer
                    component={child}
                    isThumbnail={isThumbnail}
                    scale={scale}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                className="w-full rounded-xl border-2 border-dashed border-white/40 p-4 text-center text-sm text-white/80"
                initial={!isThumbnail ? { opacity: 0 } : false}
                animate={!isThumbnail ? { opacity: 1 } : false}
              >
                Empty {component.type === "FlexRowBox" ? "Row" : "Column"} Box
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    default:
      return null;
  }
}
