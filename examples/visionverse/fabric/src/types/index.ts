import type { Id } from "../../convex/_generated/dataModel";
import type { FabricQuizScene } from "../../shared/fabricScene";

/** Quiz page entity from database */
export interface PageEntity {
  _id: Id<"pages">;
  quizId: Id<"quiz">;
  pageName?: string;
  fabricScene?: FabricQuizScene;
  userId: Id<"users">;
  _creationTime: number;
  pageType?: "page" | "onboarding";
  questionMode?: "onboarding" | "single" | "multiple";
}

/** Result page entity from database */
export interface ResultEntity {
  _id: Id<"results">;
  quizId: Id<"quiz">;
  pageName?: string;
  fabricScene?: FabricQuizScene;
  userId: Id<"users">;
  _creationTime: number;
}

/** Image entity from database */
export interface Image {
  _id: Id<"images">;
  name: string;
  userId: Id<"users">;
  storageId: Id<"_storage">;
  format?: string;
  size?: number;
  hiddenFromPicker?: boolean;
  url?: string | null;
  _creationTime: number;
}

export type { Id } from "../../convex/_generated/dataModel";
