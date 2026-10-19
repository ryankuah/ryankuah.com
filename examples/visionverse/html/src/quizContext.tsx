"use client";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useState,
  type ReactNode,
  useMemo,
} from "react";
import type {
  Quiz,
  Page,
  Component,
  ComponentType,
  ViewMode,
  Background,
} from "@/types/types";

export type QuizContextType = {
  quizId: string;
  quiz: Quiz;
  index: number;
  setIndex: Dispatch<SetStateAction<number>>;
  resultIndex: number;
  setResultIndex: Dispatch<SetStateAction<number>>;
  addPage: (viewMode: ViewMode) => void;
  removePage: (viewMode: ViewMode, idx: number) => void;
  updatePage: (viewMode: ViewMode, question: Partial<Page>) => void;
  addComponent: (
    viewMode: ViewMode,
    type: ComponentType,
    parentPath?: number[],
  ) => void;
  updateComponent: (
    viewMode: ViewMode,
    parentPath: number[],
    updatedComponent: Partial<Component>,
  ) => void;
  deleteComponent: (viewMode: ViewMode, parentPath?: number[]) => void;
  duplicateComponent: (viewMode: ViewMode, parentPath?: number[]) => void;
  updateBackground: (
    viewMode: ViewMode,
    updatedFields?: Partial<Background>,
  ) => void;
  setPages: (pages: Page[]) => void;
  setResults: (results: Page[]) => void;
  setOnboard: (onboard: Page) => void;
  pages: Page[];
  results: Page[];
  onboard: Page;
};

// Default context value with no-op functions for development/testing
/* eslint-disable @typescript-eslint/no-empty-function */
export const QuizContext = createContext<QuizContextType>({
  quizId: "",
  quiz: {} as Quiz,
  resultIndex: 0,
  setResultIndex: () => {},
  index: 0,
  setIndex: () => {},
  addPage: () => {},
  removePage: () => {},
  updatePage: () => {},
  addComponent: () => {},
  updateComponent: () => {},
  deleteComponent: () => {},
  updateBackground: () => {},
  duplicateComponent: () => {},
  setPages: () => {},
  setResults: () => {},
  setOnboard: () => {},
  pages: [],
  results: [],
  onboard: {} as Page,
});
/* eslint-enable @typescript-eslint/no-empty-function */

export default function QuizProvider({
  children,
  initialQuiz,
  quizId,
}: {
  children: ReactNode;
  initialQuiz: Quiz;
  quizId: string;
}) {
  const [index, setIndex] = useState<number>(0);
  const [resultIndex, setResultIndex] = useState<number>(0);

  const [pages, setPages] = useState<Page[]>(initialQuiz.pages);
  const [results, setResults] = useState<Page[]>(initialQuiz.results);
  const [onboard, setOnboard] = useState<Page>(initialQuiz.onboard);

  const quiz: Quiz = useMemo(
    () => ({
      name: initialQuiz.name,
      pages: pages,
      results: results,
      onboard: onboard,
    }),
    [pages, results, onboard, initialQuiz.name],
  );

  const addPage = (viewMode: ViewMode) => {
    if (viewMode === "results") {
      setResults([
        ...results,
        { components: [], background: { color: "#ffffff" } },
      ]);
    } else {
      setPages([
        ...pages,
        { components: [], background: { color: "#ffffff" } },
      ]);
    }
  };

  const removePage = (viewMode: ViewMode, idx: number) => {
    if (viewMode === "results") {
      setResults(results.filter((_, i) => i !== idx));
      setResultIndex(Math.max(0, resultIndex - 1));
    } else {
      setPages(pages.filter((_, i) => i !== idx));
      setIndex(Math.max(0, index - 1));
    }
  };

  const updatePage = (viewMode: ViewMode, updatedFields: Partial<Page>) => {
    if (viewMode === "onboard") {
      setOnboard((prev) => ({ ...prev, ...updatedFields }));
    } else if (viewMode === "results") {
      setResults((prev) =>
        prev.map((result, i) =>
          i === resultIndex ? { ...result, ...updatedFields } : result,
        ),
      );
    } else {
      setPages(
        pages.map((page, i) =>
          i === index ? { ...page, ...updatedFields } : page,
        ),
      );
    }
  };

  // Recursively updates a component at the specified path within the component tree
  const updateComponentByPath = (
    components: Component[],
    path: number[],
    updater: (component: Component) => Component,
  ): Component[] => {
    if (path.length === 0) return components;

    const [currentIndex, ...restPath] = path;

    return components.map((component, idx) => {
      if (idx !== currentIndex) return component;

      if (restPath.length === 0) {
        return updater(component);
      }

      return {
        ...component,
        children: component.children
          ? updateComponentByPath(component.children, restPath, updater)
          : [],
      };
    });
  };

  const addComponent = (
    viewMode: ViewMode,
    type: ComponentType,
    parentPath?: number[],
  ) => {
    let newComponent: Component;
    if (type === "text") {
      newComponent = { type, data: "", children: [], style: {} };
    } else if (type === "image") {
      newComponent = { type, data: "", children: [], style: {} };
    } else {
      newComponent = { type, children: [], style: {} };
    }

    if (viewMode === "onboard") {
      setOnboard((prev) => {
        return {
          ...prev,
          components: parentPath
            ? updateComponentByPath(
                prev.components,
                parentPath,
                (component) => ({
                  ...component,
                  children: [...(component.children ?? []), newComponent],
                }),
              )
            : [...prev.components, newComponent],
        };
      });
    } else if (viewMode === "results") {
      setResults((prev) => {
        const newResults = prev.map((result, i) => {
          if (i !== resultIndex) return result;
          return {
            ...result,
            components: parentPath
              ? updateComponentByPath(
                  result.components,
                  parentPath,
                  (component) => ({
                    ...component,
                    children: [...(component.children ?? []), newComponent],
                  }),
                )
              : [...result.components, newComponent],
          };
        });
        return newResults;
      });
    } else {
      setPages((prev) => {
        const newPages = prev.map((page, i) => {
          if (i !== index) return page;
          return {
            ...page,
            components: parentPath
              ? updateComponentByPath(
                  page.components,
                  parentPath,
                  (component) => ({
                    ...component,
                    children: [...(component.children ?? []), newComponent],
                  }),
                )
              : [...page.components, newComponent],
          };
        });
        return newPages;
      });
    }
  };

  const updateComponent = (
    viewMode: ViewMode,
    path: number[],
    updatedComponent: Partial<Component>,
  ) => {
    if (viewMode === "onboard") {
      setOnboard((prev) => ({
        ...prev,
        components: updateComponentByPath(
          prev.components,
          path,
          (component) =>
            ({
              ...component,
              ...updatedComponent,
            }) as Component,
        ),
      }));
    } else if (viewMode === "results") {
      setResults((prev) =>
        prev.map((result, i) => {
          if (i !== resultIndex) return result;
          return {
            ...result,
            components: updateComponentByPath(
              result.components,
              path,
              (component) =>
                ({
                  ...component,
                  ...updatedComponent,
                }) as Component,
            ),
          };
        }),
      );
    } else {
      setPages((prev) =>
        prev.map((page, i) => {
          if (i !== index) return page;
          return {
            ...page,
            components: updateComponentByPath(
              page.components,
              path,
              (component) =>
                ({
                  ...component,
                  ...updatedComponent,
                }) as Component,
            ),
          };
        }),
      );
    }
  };

  const deleteComponent = (viewMode: ViewMode, parentPath?: number[]) => {
    if (!parentPath || parentPath.length === 0) return;

    if (viewMode === "onboard") {
      setOnboard((prev) => ({
        ...prev,
        components: deleteComponentByPath(prev.components, parentPath),
      }));
    } else if (viewMode === "results") {
      setResults((prev) =>
        prev.map((result, i) => {
          if (i !== resultIndex) return result;
          return {
            ...result,
            components: deleteComponentByPath(result.components, parentPath),
          };
        }),
      );
    } else {
      setPages((prev) =>
        prev.map((page, i) => {
          if (i !== index) return page;
          return {
            ...page,
            components: deleteComponentByPath(page.components, parentPath),
          };
        }),
      );
    }
  };

  // Recursively deletes a component at the specified path
  const deleteComponentByPath = (
    components: Component[],
    path: number[],
  ): Component[] => {
    if (path.length === 0) return components;

    const [currentIndex, ...restPath] = path;

    if (path.length === 1) {
      return components.filter((_, idx) => idx !== currentIndex);
    }

    return components.map((component, idx) => {
      if (idx !== currentIndex) return component;

      return {
        ...component,
        children: deleteComponentByPath(component.children ?? [], restPath),
      };
    });
  };

  const duplicateComponent = (viewMode: ViewMode, parentPath?: number[]) => {
    if (!parentPath || parentPath.length === 0) return;

    if (viewMode === "onboard") {
      setOnboard((prev) => ({
        ...prev,
        components: duplicateComponentByPath(prev.components, parentPath),
      }));
    } else if (viewMode === "results") {
      setResults((prev) =>
        prev.map((result, i) => {
          if (i !== resultIndex) return result;
          return {
            ...result,
            components: duplicateComponentByPath(result.components, parentPath),
          };
        }),
      );
    } else {
      setPages((prev) =>
        prev.map((page, i) => {
          if (i !== index) return page;
          return {
            ...page,
            components: duplicateComponentByPath(page.components, parentPath),
          };
        }),
      );
    }
  };

  // Recursively duplicates a component at the specified path
  const duplicateComponentByPath = (
    components: Component[],
    path: number[],
  ): Component[] => {
    if (path.length === 0) return components;

    const [currentIndex, ...restPath] = path;

    if (path.length === 1 && typeof currentIndex === "number") {
      const componentToDuplicate = structuredClone(components[currentIndex]);
      if (componentToDuplicate) {
        return [
          ...components.slice(0, currentIndex + 1),
          componentToDuplicate,
          ...components.slice(currentIndex + 1),
        ];
      }
    }

    return components.map((component, idx) => {
      if (idx !== currentIndex) return component;

      return {
        ...component,
        children: duplicateComponentByPath(component.children ?? [], restPath),
      };
    });
  };

  const updateBackground = (
    viewMode: ViewMode,
    updatedFields?: Partial<Background>,
  ) => {
    if (viewMode === "onboard") {
      setOnboard((prev) => ({
        ...prev,
        background: {
          ...prev.background,
          ...updatedFields,
        },
      }));
    } else if (viewMode === "results") {
      setResults((prev) =>
        prev.map((result, i) =>
          i === resultIndex
            ? {
                ...result,
                background: {
                  ...result.background,
                  ...updatedFields,
                },
              }
            : result,
        ),
      );
    } else {
      setPages((prev) =>
        prev.map((page, i) =>
          i === index
            ? {
                ...page,
                background: {
                  ...page.background,
                  ...updatedFields,
                },
              }
            : page,
        ),
      );
    }
  };

  return (
    <QuizContext.Provider
      value={{
        quizId,
        quiz,
        index,
        setIndex,
        resultIndex,
        setResultIndex,
        addPage,
        removePage,
        updatePage,
        addComponent,
        updateComponent,
        deleteComponent,
        duplicateComponent,
        updateBackground,
        setPages,
        setResults,
        setOnboard,
        pages,
        results,
        onboard,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}
