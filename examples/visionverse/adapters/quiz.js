export async function isQuizPublished() {
  return false;
}
export async function updateQuiz(_id, quiz) {
  sessionStorage.setItem("visionverse-html-saved", JSON.stringify(quiz));
  window.dispatchEvent(
    new CustomEvent("example-status", { detail: "Saved in this tab" }),
  );
  return { success: true };
}
export async function publishQuiz() {
  window.dispatchEvent(
    new CustomEvent("example-status", {
      detail: "Publishing is unavailable in this local example",
    }),
  );
  return { success: false };
}
export const unpublishQuiz = publishQuiz;
export async function saveQuizAnswer() {}
export async function completeQuizSession() {}
