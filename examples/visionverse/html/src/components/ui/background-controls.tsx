import React, { useState, useContext, useEffect, useCallback } from "react";
import { QuizContext } from "@/quizContext";
import { Button } from "./button";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { MoveHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "./input";
import { Label } from "./label";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import SingleImageUpload from "@/components/SingleImageUpload";
import { type ViewMode } from "@/types/types";

export default function BackgroundControls({
  viewMode,
}: {
  viewMode: ViewMode;
}) {
  const { index, resultIndex, results, onboard, pages, updateBackground } =
    useContext(QuizContext);

  // Use either onboard, result, or current page based on props
  const background =
    viewMode === "onboard"
      ? onboard?.background
      : viewMode === "results"
        ? results?.[resultIndex]?.background
        : viewMode === "template"
          ? pages[0]?.background
          : pages[index]?.background;

  const [color, setColor] = useState<string>(background?.color ?? "#ffffff");
  const [isExpanded, setIsExpanded] = useState(false);

  const [bgPositionX, setBgPositionX] = useState<string>(
    background?.settings?.left?.toString() ?? "0",
  );
  const [bgPositionY, setBgPositionY] = useState<string>(
    background?.settings?.top?.toString() ?? "0",
  );

  const [bgOpacity, setBgOpacity] = useState<number>(
    background?.settings?.opacity ?? 100,
  );

  // For dragging functionality
  const [isDraggingX, setIsDraggingX] = useState(false);
  const [isDraggingY, setIsDraggingY] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [bgScale, setBgScale] = useState<number>(
    background?.settings?.scale ?? 100,
  );

  // Auto-animate refs
  const [animateRef] = useAutoAnimate();

  // Define handleDragEnd before it's used in useEffect
  const handleDragEnd = useCallback(() => {
    setIsDraggingX(false);
    setIsDraggingY(false);
  }, []);

  // Define handleDragMove before it's used in useEffect
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const clientX =
        "touches" in e && e.touches[0]
          ? e.touches[0].clientX
          : "clientX" in e
            ? e.clientX
            : 0;
      const clientY =
        "touches" in e && e.touches[0]
          ? e.touches[0].clientY
          : "clientY" in e
            ? e.clientY
            : 0;

      if (isDraggingX) {
        const deltaX = clientX - startPos.x;
        // Update position (negative delta for more intuitive dragging)
        const currentX =
          bgPositionX === "" || bgPositionX === "-" ? 0 : parseInt(bgPositionX);
        const newX = currentX - Math.round(deltaX / 2);
        setBgPositionX(newX.toString());

        // Update the background settings
        updateBackground(viewMode, {
          settings: {
            left: newX,
          },
        });

        setStartPos((prev) => ({ ...prev, x: clientX }));
      }

      if (isDraggingY) {
        const deltaY = clientY - startPos.y;
        // Update position (negative delta for more intuitive dragging)
        const currentY =
          bgPositionY === "" || bgPositionY === "-" ? 0 : parseInt(bgPositionY);
        const newY = currentY - Math.round(deltaY / 2);
        setBgPositionY(newY.toString());

        // Update the background settings
        updateBackground(viewMode, {
          settings: {
            top: newY,
          },
        });

        setStartPos((prev) => ({ ...prev, y: clientY }));
      }
    },
    [
      isDraggingX,
      isDraggingY,
      startPos,
      bgPositionX,
      bgPositionY,
      updateBackground,
      setBgPositionX,
      setBgPositionY,
      setStartPos,
      viewMode,
    ],
  );

  // Add and remove event listeners
  useEffect(() => {
    if (isDraggingX || isDraggingY) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchend", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [
    isDraggingX,
    isDraggingY,
    startPos,
    bgPositionX,
    bgPositionY,
    handleDragEnd,
    handleDragMove,
  ]);

  // Get current page, result or onboard
  if (viewMode === "onboard" && !onboard) return null;
  if (viewMode === "results" && !results?.[resultIndex]) return null;
  if (viewMode === "template" && !pages[0]) return null;
  if (
    viewMode !== "onboard" &&
    viewMode !== "results" &&
    viewMode !== "template" &&
    !pages[index]
  )
    return null;

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    updateBackground(viewMode, {
      color: newColor,
    });
  };

  // Handle background position changes
  const handleBgPositionChange = (
    newPositionX: string,
    newPositionY: string,
  ) => {
    //Apply a regex to check if the value is a number
    if (
      (newPositionX !== "" && !/^-?[0-9]+$/.test(newPositionX)) ||
      (newPositionY !== "" && !/^-?[0-9]+$/.test(newPositionY))
    ) {
      return;
    }

    setBgPositionX(newPositionX);
    setBgPositionY(newPositionY);

    // Update the background settings
    updateBackground(viewMode, {
      settings: {
        left: parseInt(newPositionX),
        top: parseInt(newPositionY),
      },
    });
  };

  // Handle opacity changes
  const handleOpacityChange = (newOpacity: number) => {
    setBgOpacity(newOpacity);

    // Update the background settings
    updateBackground(viewMode, {
      settings: {
        opacity: newOpacity,
      },
    });
  };

  const handleScaleChange = (scale: number) => {
    setBgScale(scale);

    // Update the background settings
    updateBackground(viewMode, {
      settings: {
        scale: scale / 100,
      },
    });
  };

  // Handle mouse/touch events for X-axis dragging
  const handleDragStartX = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingX(true);
    const clientX =
      "touches" in e && e.touches[0]
        ? e.touches[0].clientX
        : "clientX" in e
          ? e.clientX
          : 0;
    setStartPos((prev) => ({ ...prev, x: clientX }));
  };

  // Handle mouse/touch events for Y-axis dragging
  const handleDragStartY = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingY(true);
    const clientY =
      "touches" in e && e.touches[0]
        ? e.touches[0].clientY
        : "clientY" in e
          ? e.clientY
          : 0;
    setStartPos((prev) => ({ ...prev, y: clientY }));
  };

  return (
    <div
      className="rounded-lg border border-purple-200 bg-purple-50 p-6 text-purple-700 shadow-sm"
      ref={animateRef}
    >
      <div
        className="flex cursor-pointer items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="mr-1 text-xs text-purple-500">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <h3 className="flex-grow text-sm font-medium">Background Settings</h3>
      </div>

      {isExpanded && (
        <div ref={animateRef}>
          <div className="space-y-2">
            <p className="text-xs text-purple-700">Background Color</p>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 w-10 rounded-md p-0"
                    style={{ backgroundColor: color }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto border border-purple-500 bg-white p-3 shadow-md">
                  <HexColorPicker color={color} onChange={handleColorChange} />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs">{color}</span>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs text-purple-700">Background Image</p>
            <div
              className="custom-single-image-upload"
              style={{ maxWidth: "100%" }}
            >
              <SingleImageUpload viewMode={viewMode} />
            </div>

            {background?.image && (
              <div ref={animateRef}>
                {/* Image Controls */}
                <div className="mt-2 space-y-3 rounded-md border border-gray-100 p-2">
                  {/* Position Controls */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <MoveHorizontal className="h-3 w-3" /> Position
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="mb-1 block text-xs">X Position</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            pattern="-?[0-9]*"
                            value={bgPositionX}
                            className="h-7 text-xs"
                            onChange={(e) => {
                              handleBgPositionChange(
                                e.target.value,
                                bgPositionY,
                              );
                            }}
                          />
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded border border-gray-200 ${isDraggingX ? "cursor-grabbing bg-blue-100" : "cursor-grab hover:bg-gray-100"}`}
                            onMouseDown={handleDragStartX}
                            onTouchStart={handleDragStartX}
                            title="Drag to adjust X position"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M5 12H19M5 12L9 8M5 12L9 16M19 12L15 8M19 12L15 16"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Y Position</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="text"
                            pattern="-?[0-9]*"
                            value={bgPositionY}
                            className="h-7 text-xs"
                            onChange={(e) => {
                              handleBgPositionChange(
                                bgPositionX,
                                e.target.value,
                              );
                            }}
                          />
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded border border-gray-200 ${isDraggingY ? "cursor-grabbing bg-blue-100" : "cursor-grab hover:bg-gray-100"}`}
                            onMouseDown={handleDragStartY}
                            onTouchStart={handleDragStartY}
                            title="Drag to adjust Y position"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 5V19M12 5L8 9M12 5L16 9M12 19L8 15M12 19L16 15"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-1">
                    <Label className="text-xs">Opacity {bgOpacity}%</Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bgOpacity}
                      onChange={(e) =>
                        handleOpacityChange(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                  {/* Scale Slider */}
                  <div className="space-y-1">
                    <Label className="text-xs">Scale {bgScale}%</Label>
                    <input
                      type="range"
                      min={0}
                      max={1000}
                      value={bgScale}
                      onChange={(e) =>
                        handleScaleChange(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
