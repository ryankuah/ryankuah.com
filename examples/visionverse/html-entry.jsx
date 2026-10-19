import React, { useContext, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import EditPage from "./html/src/app/edit/[quizid]/page";
import QuizProvider, { QuizContext } from "./html/src/quizContext";
import PlayProvider, { PlayContext } from "./html/src/playContext";
import Renderer from "./html/src/components/renderers/Renderer";
const text = (data, style = {}, action) => ({
  type: "text",
  data,
  style,
  action,
});
const titleStyle = {
  fontSize: "1.75rem",
  fontWeight: "700",
  textAlign: "center",
  marginBottom: "24px",
  color: "#1e3a8a",
};
const buttonStyle = {
  padding: "18px",
  backgroundColor: "#dbeafe",
  borderRadius: "12px",
  textAlign: "center",
  color: "#1e3a8a",
  fontSize: "1.125rem",
  marginBottom: "12px",
};
const question = {
  name: "Question 1",
  background: { color: "#ffffff" },
  components: [
    text("Choose your next adventure", titleStyle),
    text("What would you like to explore?", {
      textAlign: "center",
      marginBottom: "30px",
      fontSize: "1rem",
    }),
    {
      type: "FlexColBox",
      style: { gap: "12px" },
      children: [
        "A hidden forest",
        "A floating city",
        "An ancient library",
      ].map((label, i) =>
        text(label, buttonStyle, {
          type: "answer",
          selectedOption: ["Explorer", "Inventor", "Scholar"][i],
          score: 1,
        }),
      ),
    },
  ],
};
const quiz = {
  name: "Adventure quiz",
  onboard: {
    name: "Welcome",
    background: { color: "#eff6ff" },
    components: [
      text("Discover your adventure", { ...titleStyle, marginTop: "100px" }),
      text("Answer a question to find your next destination.", {
        textAlign: "center",
        fontSize: "1.125rem",
        marginBottom: "48px",
      }),
      text("Start quiz", buttonStyle, { type: "startQuiz" }),
    ],
  },
  pages: [question],
  results: ["Explorer", "Inventor", "Scholar"].map((name) => ({
    name,
    background: { color: "#eff6ff" },
    components: [
      text(name, titleStyle),
      text("Your next adventure is waiting.", {
        fontSize: "1.125rem",
        textAlign: "center",
      }),
    ],
  })),
};
function Player() {
  const p = useContext(PlayContext);
  const page = !p.isOnboardingCompleted
    ? p.quiz.onboard
    : p.currentPageIndex >= p.totalPages
      ? p.getHighestScoringResult()
      : p.quiz.pages[p.currentPageIndex];
  return (
    <div className="flex h-full items-center justify-center bg-gray-300">
      <div
        style={{ width: 390, height: 844, transform: "scale(.75)" }}
        className="overflow-hidden rounded-3xl bg-white"
      >
        <Renderer page={page} />
      </div>
    </div>
  );
}
function Example() {
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Local example · sample quiz");
  const { quiz } = useContext(QuizContext);
  useEffect(() => {
    const listener = (e) => setStatus(e.detail);
    window.addEventListener("example-status", listener);
    return () => window.removeEventListener("example-status", listener);
  }, []);
  return (
    <>
      <div className="example-controls">
        <span aria-live="polite">{status}</span>
        <div>
          <button onClick={() => setPlaying(!playing)}>
            {playing ? "Back to editor" : "Play quiz"}
          </button>
          <button onClick={() => location.reload()}>Reset example</button>
        </div>
      </div>
      <div className="example-body">
        {playing ? (
          <PlayProvider quizId="local-example" initialQuiz={quiz}>
            <Player />
          </PlayProvider>
        ) : (
          <EditPage />
        )}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <QuizProvider initialQuiz={quiz} quizId="local-example">
    <Example />
  </QuizProvider>,
);
