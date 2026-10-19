import type React from "react";

export type ViewMode = "edit" | "results" | "onboard" | "template";

export type Quiz = {
  pages: Page[];
  name: string;
  onboard: Page;
  results: Page[];
};

export type Page = {
  name?: string;
  components: Component[];
  background: Background;
};

export type BackgroundSettings = {
  size?: string;
  top?: number;
  left?: number;
  opacity?: number;
  scale?: number;
};

export type Background = {
  color?: string;
  image?: string;
  settings?: BackgroundSettings;
};

export type ComponentType =
  | "FlexColBox"
  | "FlexRowBox"
  | "text"
  | "image"
  | "AnswerBox";

export type ActionType =
  | "previousPage"
  | "nextPage"
  | "redirect"
  | "answer"
  | "startQuiz";

export type Action =
  | { type: "previousPage" }
  | { type: "nextPage" }
  | { type: "redirect"; url: string }
  | { type: "answer"; selectedOption?: string; score?: number }
  | { type: "startQuiz" };

export type Component = {
  children?: Component[];
  action?: Action;
  style: React.CSSProperties;
} & (
  | {
      type: "text";
      data?: string;
    }
  | {
      type: "image";
      data?: string;
    }
  | {
      type: "FlexColBox" | "FlexRowBox";
    }
  | {
      type: "AnswerBox";
      data?: {
        selectedOption?: string;
        score?: string;
      };
    }
);

export type Padding = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
};
