"use client";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useState,
  type ReactNode,
  useEffect,
  useCallback,
} from "react";
import type { Quiz, Page } from "@/types/types";
import { saveQuizAnswer, completeQuizSession } from "@/actions/quiz";

export type PlayContextType = {
  quizId: string;
  quiz: Quiz;
  currentPageIndex: number;
  setCurrentPageIndex: Dispatch<SetStateAction<number>>;
  resultScores: Record<string, number>;
  updateResultScore: (
    resultName: string,
    score: number,
    clickedContent?: string,
  ) => void;
  isQuizCompleted: boolean;
  isOnboardingCompleted: boolean;
  startQuiz: () => void;
  getHighestScoringResult: () => Page | null;
  getHighestScoringResultName: () => string | null;
  resetQuiz: () => void;
  totalPages: number;
};

// Default context value with no-op functions
export const PlayContext = createContext<PlayContextType>({
  quizId: "",
  quiz: {} as Quiz,
  currentPageIndex: 0,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setCurrentPageIndex: () => {},
  resultScores: {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  updateResultScore: () => {},
  isQuizCompleted: false,
  isOnboardingCompleted: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  startQuiz: () => {},
  getHighestScoringResult: () => null,
  getHighestScoringResultName: () => null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  resetQuiz: () => {},
  totalPages: 0,
});

// Detects device type for analytics and user experience customization
function getDeviceType(): "iOS" | "Android" | "Other" {
  if (typeof navigator === "undefined") {
    return "Other";
  }
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
  return "Other";
}

export default function PlayProvider({
  children,
  initialQuiz,
  quizId,
}: {
  children: ReactNode;
  initialQuiz: Quiz;
  quizId: string;
}) {
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [resultScores, setResultScores] = useState<Record<string, number>>({});
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] =
    useState<boolean>(false);
  const [pageEntryTime, setPageEntryTime] = useState<number>(Date.now());
  const [timePerPage, setTimePerPage] = useState<Record<number, number>>({});
  const [deviceType, setDeviceType] = useState<"iOS" | "Android" | "Other">(
    "Other",
  );

  const totalPages = initialQuiz.pages.length;

  // Initialize device type detection
  useEffect(() => {
    const type = getDeviceType();
    setDeviceType(type);
  }, []);

  // Initialize result scores with 0 for all results
  useEffect(() => {
    const initialScores: Record<string, number> = {};
    initialQuiz.results.forEach((result, index) => {
      const resultName = result.name ?? `Result ${index + 1}`;
      initialScores[resultName] = 0;
    });
    setResultScores(initialScores);
  }, [initialQuiz.results]);

  // Updates result scores and saves individual answers with timing data
  const updateResultScore = (
    resultName: string,
    score: number,
    clickedContent?: string,
  ) => {
    const now = Date.now();
    const timeSpent = Math.floor((now - pageEntryTime) / 1000);

    setResultScores((prev) => ({
      ...prev,
      [resultName]: (prev[resultName] ?? 0) + score,
    }));

    // Save the individual answer with timing data
    const contentToSave = clickedContent ?? resultName;
    saveQuizAnswer(
      quizId,
      currentPageIndex,
      contentToSave,
      score,
      timeSpent,
    ).catch((error) => {
      console.error("Error saving answer:", error);
    });

    setTimePerPage((prev) => ({
      ...prev,
      [currentPageIndex]: timeSpent,
    }));
    setPageEntryTime(now);
  };

  const startQuiz = () => {
    setIsOnboardingCompleted(true);
  };

  const getHighestScoringResultName = useCallback((): string | null => {
    if (Object.keys(resultScores).length === 0) return null;

    let highestScore = -Infinity;
    let highestScoringResultName = "";

    Object.entries(resultScores).forEach(([resultName, score]) => {
      if (score > highestScore) {
        highestScore = score;
        highestScoringResultName = resultName;
      }
    });

    return highestScoringResultName || null;
  }, [resultScores]);

  const getHighestScoringResult = (): Page | null => {
    const resultName = getHighestScoringResultName();
    if (!resultName) return null;

    const resultPage = initialQuiz.results.find(
      (result, index) => (result.name ?? `Result ${index + 1}`) === resultName,
    );

    return resultPage ?? null;
  };

  // Wrapper for setCurrentPageIndex that tracks time spent on each page
  const setPageIndexWithTiming: Dispatch<SetStateAction<number>> = (value) => {
    const now = Date.now();
    const timeSpent = now - pageEntryTime;

    setTimePerPage((prev) => ({
      ...prev,
      [currentPageIndex]: (prev[currentPageIndex] ?? 0) + timeSpent,
    }));

    setCurrentPageIndex((prevIndex) => {
      const newIndex = typeof value === "function" ? value(prevIndex) : value;

      setPageEntryTime(now);
      return newIndex;
    });
  };

  // Complete quiz session when all pages are finished
  useEffect(() => {
    const completed = currentPageIndex >= totalPages;
    setIsQuizCompleted(completed);

    if (completed && !isQuizCompleted) {
      const finalResult = getHighestScoringResultName();
      if (finalResult) {
        completeQuizSession(quizId, finalResult, deviceType).catch((error) => {
          console.error("Error completing quiz session:", error);
        });
      }
    }
  }, [
    currentPageIndex,
    totalPages,
    isQuizCompleted,
    getHighestScoringResultName,
    quizId,
    deviceType,
  ]);

  const resetQuiz = () => {
    setCurrentPageIndex(0);
    setIsQuizCompleted(false);
    setIsOnboardingCompleted(false);
    setPageEntryTime(Date.now());
    setTimePerPage({});

    const resetScores: Record<string, number> = {};
    initialQuiz.results.forEach((result, index) => {
      const resultName = result.name ?? `Result ${index + 1}`;
      resetScores[resultName] = 0;
    });
    setResultScores(resetScores);
  };

  return (
    <PlayContext.Provider
      value={{
        quizId,
        quiz: initialQuiz,
        currentPageIndex,
        setCurrentPageIndex: setPageIndexWithTiming,
        resultScores,
        updateResultScore,
        isQuizCompleted,
        isOnboardingCompleted,
        startQuiz,
        getHighestScoringResult,
        getHighestScoringResultName,
        resetQuiz,
        totalPages,
      }}
    >
      {children}
    </PlayContext.Provider>
  );
}
