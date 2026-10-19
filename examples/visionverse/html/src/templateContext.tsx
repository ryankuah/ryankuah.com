"use client";

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type {
  Page,
  Component,
  ComponentType,
  Background,
  ViewMode,
} from "@/types/types";

interface TemplateContextType {
  // Template state
  currentPage: Page;
  onPageUpdate: (page: Page) => void;

  // QuizContext-compatible interface for existing components
  index: number;
  resultIndex: number;
  pages: Page[];
  onboard: Page;
  results: Page[];

  // Functions that the existing components expect
  addComponent: (
    viewMode: ViewMode,
    type: ComponentType,
    parentPath?: number[],
  ) => void;
  updateComponent: (
    viewMode: ViewMode,
    path: number[],
    updatedComponent: Partial<Component>,
  ) => void;
  deleteComponent: (viewMode: ViewMode, path: number[]) => void;
  duplicateComponent: (viewMode: ViewMode, path: number[]) => void;
  updatePage: (viewMode: ViewMode, updates: Partial<Page>) => void;
  updateBackground: (
    viewMode: ViewMode,
    background: Partial<Background>,
  ) => void;

  // Not needed for templates but required for compatibility
  addPage: (viewMode: ViewMode) => void;
  removePage: (viewMode: ViewMode, index: number) => void;
  setIndex: (index: number) => void;
  setResultIndex: (index: number) => void;
}

const TemplateContext = createContext<TemplateContextType | null>(null);

interface TemplateProviderProps {
  children: ReactNode;
  initialPage: Page;
  onPageChange: (page: Page) => void;
}

export function TemplateProvider({
  children,
  initialPage,
  onPageChange,
}: TemplateProviderProps) {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);

  const onPageUpdate = (page: Page) => {
    setCurrentPage(page);
    onPageChange(page);
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

  const addComponent = (
    viewMode: ViewMode,
    type: ComponentType,
    parentPath?: number[],
  ) => {
    if (viewMode !== "template") return;

    let newComponent: Component;
    if (type === "text") {
      newComponent = { type, data: "", children: [], style: {} };
    } else if (type === "image") {
      newComponent = { type, data: "", children: [], style: {} };
    } else {
      newComponent = { type, children: [], style: {} };
    }

    const updatedComponents = parentPath
      ? updateComponentByPath(
          currentPage.components,
          parentPath,
          (component) => ({
            ...component,
            children: [...(component.children ?? []), newComponent],
          }),
        )
      : [...currentPage.components, newComponent];

    onPageUpdate({
      ...currentPage,
      components: updatedComponents,
    });
  };

  const updateComponent = (
    viewMode: ViewMode,
    path: number[],
    updatedComponent: Partial<Component>,
  ) => {
    if (viewMode !== "template") return;

    const updatedComponents = updateComponentByPath(
      currentPage.components,
      path,
      (component) =>
        ({
          ...component,
          ...updatedComponent,
        }) as Component,
    );

    onPageUpdate({
      ...currentPage,
      components: updatedComponents,
    });
  };

  const deleteComponent = (viewMode: ViewMode, path: number[]) => {
    if (viewMode !== "template" || path.length === 0) return;

    const updatedComponents = deleteComponentByPath(
      currentPage.components,
      path,
    );

    onPageUpdate({
      ...currentPage,
      components: updatedComponents,
    });
  };

  const duplicateComponent = (viewMode: ViewMode, path: number[]) => {
    if (viewMode !== "template" || path.length === 0) return;

    const [currentIndex, ...restPath] = path;

    if (path.length === 1 && typeof currentIndex === "number") {
      const componentToDuplicate = structuredClone(
        currentPage.components[currentIndex],
      );
      if (componentToDuplicate) {
        const updatedComponents = [
          ...currentPage.components.slice(0, currentIndex + 1),
          componentToDuplicate,
          ...currentPage.components.slice(currentIndex + 1),
        ];

        onPageUpdate({
          ...currentPage,
          components: updatedComponents,
        });
      }
    }
  };

  const updatePage = (viewMode: ViewMode, updates: Partial<Page>) => {
    if (viewMode !== "template") return;

    onPageUpdate({
      ...currentPage,
      ...updates,
    });
  };

  const updateBackground = (
    viewMode: ViewMode,
    background: Partial<Background>,
  ) => {
    if (viewMode !== "template") return;

    onPageUpdate({
      ...currentPage,
      background: {
        ...currentPage.background,
        ...background,
      },
    });
  };

  // Compatibility methods - not applicable in template context
  const addPage = () => {
    // Template context operates on a single page, so adding pages is not applicable
  };

  const removePage = () => {
    // Template context operates on a single page, so removing pages is not applicable
  };

  const setIndex = () => {
    // Template context doesn't use page indexing since it operates on a single page
  };

  const setResultIndex = () => {
    // Template context doesn't have result pages, so result indexing is not applicable
  };

  const contextValue: TemplateContextType = {
    currentPage,
    onPageUpdate,
    index: 0,
    resultIndex: 0,
    pages: [currentPage],
    onboard: currentPage,
    results: [],
    addComponent,
    updateComponent,
    deleteComponent,
    duplicateComponent,
    updatePage,
    updateBackground,
    addPage,
    removePage,
    setIndex,
    setResultIndex,
  };

  return (
    <TemplateContext.Provider value={contextValue}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplateContext() {
  const context = useContext(TemplateContext);
  return context; // Return null if not in provider instead of throwing
}

export function useTemplateContextRequired() {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error(
      "useTemplateContextRequired must be used within a TemplateProvider",
    );
  }
  return context;
}
