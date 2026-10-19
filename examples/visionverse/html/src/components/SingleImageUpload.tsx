"use client";
import { useContext, useState } from "react";
import { QuizContext } from "@/quizContext";
import { useTemplateContext } from "@/templateContext";
import { Button } from "@/components/ui/button";
import { ImageIcon, X, Loader2 } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { type ViewMode } from "@/types/types";

export default function SingleImageUpload({
  image,
  uploadPath,
  viewMode,
}: {
  image?: string;
  uploadPath?: number[];
  viewMode: ViewMode;
}) {
  // Always call all hooks unconditionally
  const quizContext = useContext(QuizContext);
  const templateContext = useTemplateContext();

  const { startUpload } = useUploadThing("imageUploader");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Select the appropriate context based on viewMode
  const context = viewMode === "template" ? templateContext : quizContext;

  if (!context) {
    return (
      <p className="p-4 text-red-500">
        {viewMode === "template" ? "Template" : "Quiz"} context not found.
      </p>
    );
  }

  const { updateBackground, updateComponent } = context;

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null); // Clear previous errors
    try {
      const uploadResult = await startUpload([file]);
      if (!uploadResult?.[0]?.ufsUrl) {
        setUploadError(
          "Upload failed or image URL not found. Please try again.",
        );
        setIsUploading(false);
        return;
      }
      if (uploadPath) {
        updateComponent(viewMode, uploadPath, {
          data: uploadResult[0].ufsUrl,
        });
      } else {
        updateBackground(viewMode, {
          image: uploadResult[0].ufsUrl,
        });
      }
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred during upload.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setUploadError(null); // Clear error when removing/changing image
    if (uploadPath) {
      updateComponent(viewMode, uploadPath, {
        data: "",
      });
    } else {
      updateBackground(viewMode, {
        image: "",
      });
    }
  };

  const fileInputId = `file-upload-${uploadPath?.join("-") ?? "background"}`;
  const errorId = `upload-error-${uploadPath?.join("-") ?? "background"}`;

  return (
    <div className="flex w-full flex-col gap-2">
      {!image ? (
        <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-purple-400 bg-white p-4">
          <Button
            onClick={() => document.getElementById(fileInputId)?.click()}
            variant="ghost"
            className="flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700"
            disabled={isUploading}
            aria-label={isUploading ? "Uploading image" : "Upload image"}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-xs">Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-purple-500" />
                <span className="text-xs text-purple-500">
                  Click to upload image
                </span>
              </>
            )}
          </Button>
          <input
            id={fileInputId}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                void uploadFile(e.target.files[0]);
              }
              // Reset file input to allow uploading the same file again after an error or removal
              if (e.target) {
                e.target.value = "";
              }
            }}
            accept="image/*"
            disabled={isUploading}
            aria-describedby={uploadError ? errorId : undefined}
          />
        </div>
      ) : (
        <div className="relative w-full pr-4">
          {isUploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black bg-opacity-50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="ml-2 text-white">Uploading...</span>
            </div>
          )}
          <img
            src={image}
            alt="Preview"
            className={`h-auto w-full max-w-[200px] rounded-md object-contain ${isUploading ? "opacity-50" : ""}`}
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute right-6 top-2 z-20 h-6 w-6 rounded-full bg-gray-800 p-0 text-xs hover:bg-gray-900"
            onClick={removeFile}
            disabled={isUploading}
            aria-label="Remove image"
          >
            <X className="h-3 w-3" color="white" />
          </Button>
        </div>
      )}
      {uploadError && (
        <p id={errorId} className="mt-1 text-xs text-red-500" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}
