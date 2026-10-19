import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import FabricSceneEditor from "./fabric/src/components/editor/FabricSceneEditor";
import { FabricSceneRenderer } from "./fabric/src/components/editor/FabricSceneRenderer";
import {
  DEFAULT_WORKSPACE,
  DEFAULT_ARTBOARD,
} from "./fabric/shared/fabricScene";
const makeText = (id, text, left, top, width, fontSize, extra = {}) => ({
  type: "Textbox",
  version: "7.4.0",
  left,
  top,
  width,
  fontSize,
  text,
  fontFamily: "Arial",
  fill: "#1e3a8a",
  originX: "left",
  originY: "top",
  vvId: id,
  vvName: text,
  vvRole: "decorative",
  ...extra,
});
const original = {
  schemaVersion: 1,
  workspace: DEFAULT_WORKSPACE,
  artboard: DEFAULT_ARTBOARD,
  background: { color: "#eff6ff" },
  fabric: {
    version: "7.4.0",
    objects: [
      makeText("title", "Choose your next\nadventure", 390, 100, 330, 32, {
        fontWeight: 700,
      }),
      makeText(
        "subtitle",
        "What would you like to explore?",
        390,
        210,
        330,
        18,
      ),
      ...["A hidden forest", "A floating city", "An ancient library"].map(
        (label, i) =>
          makeText(`answer-${i}`, label, 390, 320 + i * 100, 330, 22, {
            backgroundColor: "#dbeafe",
            padding: 16,
            vvRole: "answer",
            vvAction: "answerBox",
          }),
      ),
    ],
  },
};
const images = [
  ["original-cover.jpg", "Study Companion"],
  ["original-question.jpg", "Fantasy question"],
  ["original-items.jpg", "Enchanted items"],
].map(([file, name]) => ({ url: `/images/visionverse/${file}`, name }));
function Example() {
  const [scene, setScene] = useState(original);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Local example · sample quiz");
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState("single");
  return (
    <>
      <div className="example-controls">
        <span aria-live="polite">{status}</span>
        <div>
          <button onClick={() => setPlaying(!playing)}>
            {playing ? "Back to editor" : "Preview quiz"}
          </button>
          <button onClick={() => location.reload()}>Reset example</button>
        </div>
      </div>
      <div className="example-body relative">
        {playing && (
          <div className="flex h-full items-center justify-center bg-slate-100">
            <FabricSceneRenderer
              scene={scene}
              scale={0.75}
              answerSelectionEnabled
              selectedAnswerIds={selected}
              onAction={(action, props, id) => {
                if (action === "answerBox") {
                  setSelected([id]);
                  setStatus("Answer selected");
                }
              }}
            />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ visibility: playing ? "hidden" : "visible" }}
        >
          <FabricSceneEditor
            scene={scene}
            sceneKey="local-example"
            images={images}
            answerSelectionMode={mode}
            onAnswerSelectionModeChange={setMode}
            onSaveScene={(value) => {
              setScene(value);
              setStatus("Changes kept in this example");
            }}
            sidebarHeader={
              <div className="px-3 py-3 text-sm font-semibold text-slate-800">
                Question 1
              </div>
            }
          />
        </div>
      </div>
      <Toaster />
    </>
  );
}
createRoot(document.getElementById("root")).render(<Example />);
