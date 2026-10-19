"use client";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useContext, useState, useEffect } from "react";
import { QuizContext } from "@/quizContext";
import {
  updateQuiz,
  publishQuiz,
  unpublishQuiz,
  isQuizPublished,
} from "@/actions/quiz";
import { useRouter, useParams } from "next/navigation";
import {
  AlignVerticalJustifyCenter,
  EditIcon,
  EyeIcon,
  Globe,
  Lock,
} from "lucide-react";
import Editor from "./Editor";
import Preview from "./preview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
type ViewMode = "edit" | "results" | "onboard";
export default function EditPage() {
  const { quiz, index } = useContext(QuizContext);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizid as string;
  const [viewMode, setViewMode] = useState<ViewMode>("onboard");

  useEffect(() => {
    // Check if quiz is published when component loads
    const checkPublishedStatus = async () => {
      try {
        const published = await isQuizPublished(quizId);
        setIsPublished(published);
      } catch (error) {
        console.error("Error checking published status:", error);
        setIsPublished(false);
      }
    };

    void checkPublishedStatus();
  }, [quizId]);
  if (!quiz.pages[index]) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xl text-red-500">
        Quiz data not found or invalid page index.
      </div>
    );
  }
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const result = await updateQuiz(
        quizId,
        quiz,
        quiz.name ?? "Untitled Quiz",
      );
      if (result.success) {
        router.push("/myquizzes");
      } else {
        console.error("Failed to save quiz");
      }
    } catch (error) {
      console.error("Error saving quiz:", error);
    } finally {
      setIsSaving(false);
    }
  };
  const handlePublishToggle = async () => {
    try {
      setIsPublishing(true);
      const result = isPublished
        ? await unpublishQuiz(quizId)
        : await publishQuiz(quizId);

      if (result.success) {
        setIsPublished(!isPublished);
        console.log(
          `Quiz ${isPublished ? "unpublished" : "published"} successfully`,
        );
      } else {
        console.error("Failed to toggle publish status:", result.error);
      }
    } catch (error) {
      console.error("Error toggling publish status:", error);
    } finally {
      setIsPublishing(false);
    }
  };
  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Top Navigation */}
      <div className="flex w-full items-center justify-between bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4 shadow-md">
        <Link href="/myquizzes">
          <h1 className="text-2xl font-bold text-white">VisionVerse</h1>
        </Link>

        {/* View Mode Dropdown */}
        <div className="flex flex-grow justify-center">
          <div className="w-48">
            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
            >
              <SelectTrigger className="border-white bg-white font-medium text-black">
                <SelectValue placeholder="View Mode" />
              </SelectTrigger>
              <SelectContent className="border-0 bg-white shadow-md">
                <SelectItem value="onboard" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <AlignVerticalJustifyCenter className="h-4 w-4" />
                    <span>Start Page</span>
                  </div>
                </SelectItem>
                <SelectItem value="edit" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <EditIcon className="h-4 w-4" />
                    <span>Edit Mode</span>
                  </div>
                </SelectItem>
                <SelectItem value="results" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <EyeIcon className="h-4 w-4" />
                    <span>Results Mode</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            className={`rounded-full border-2 border-white px-6 py-2 text-white backdrop-blur-sm transition-all ${
              isPublished
                ? "bg-orange-500/20 hover:bg-orange-500/30"
                : "bg-green-500/20 hover:bg-green-500/30"
            }`}
            onClick={handlePublishToggle}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                {isPublished ? "Unpublishing..." : "Publishing..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isPublished ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                {isPublished ? "Unpublish" : "Publish"}
              </div>
            )}
          </Button>
          <Button
            className="rounded-full border-2 border-white bg-white/20 px-6 py-2 text-white backdrop-blur-sm transition-all hover:bg-white/30"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Link href="/myquizzes">
            <Button className="rounded-full border-2 border-white bg-white/20 px-6 py-2 text-white backdrop-blur-sm transition-all hover:bg-white/30">
              Cancel
            </Button>
          </Link>
          <UserButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-full w-full overflow-hidden">
        <section className="h-full w-[850] overflow-hidden">
          <Editor viewMode={viewMode} />
        </section>
        <section className="h-full w-full overflow-hidden">
          <Preview viewMode={viewMode} />
        </section>
      </div>
    </main>
  );
}
