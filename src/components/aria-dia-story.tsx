"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { AriaChapter } from "@/data/aria-story";
import styles from "./aria-dia-story.module.css";

export type DiaStage = "typing" | "browsers" | "building";
export type DiaProgress = Record<"browsers" | "building", number>;

function TypedParagraphs({
  paragraphs,
  characters,
  complete,
}: {
  paragraphs: string[];
  characters: number;
  complete: boolean;
}) {
  let remaining = characters;
  return paragraphs.map((paragraph, index) => {
    const visible = Math.max(0, Math.min(remaining, paragraph.length));
    const cursor = !complete && remaining >= 0 && remaining < paragraph.length;
    remaining -= paragraph.length;
    if (!visible && !cursor) return null;
    return (
      <p key={index}>
        {paragraph.slice(0, visible)}
        {cursor && <span className={styles.responseCaret} aria-hidden="true" />}
      </p>
    );
  });
}

function Sparkle() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2c0 7-3 10-10 10 7 0 10 3 10 10 0-7 3-10 10-10-7 0-10-3-10-10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 9 5-5 5 5M10 4v12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DiaIntro({
  prompt,
  setStage,
}: {
  prompt: string;
  setStage: Dispatch<SetStateAction<DiaStage>>;
}) {
  const [characters, setCharacters] = useState(0);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let tick: ReturnType<typeof setInterval> | undefined;
    let sent: ReturnType<typeof setTimeout>;
    const finish = () => setStage("browsers");
    if (motion.matches) sent = setTimeout(finish, 0);
    else {
      const started = performance.now();
      tick = setInterval(() => {
        setCharacters(
          Math.min(
            prompt.length,
            Math.floor((performance.now() - started) / 48),
          ),
        );
      }, 48);
      sent = setTimeout(finish, prompt.length * 48 + 650);
    }
    const changeMotion = () => {
      if (motion.matches) finish();
    };
    motion.addEventListener("change", changeMotion);
    return () => {
      clearInterval(tick);
      clearTimeout(sent);
      motion.removeEventListener("change", changeMotion);
    };
  }, [prompt, setStage]);

  return (
    <div className={styles.intro}>
      <div className={styles.brand}>
        <Sparkle />
        <span>&quot;Dia&quot;</span>
      </div>
      <h3>What’s on your mind?</h3>
      <button
        className={styles.composer}
        type="button"
        aria-label="Send browser question"
        onClick={() => setStage("browsers")}
      >
        <span className={styles.typing}>
          <span aria-hidden="true">
            {prompt.slice(0, characters)}
            <i />
          </span>
        </span>
        <span className={styles.sendIcon} aria-hidden="true">
          <SendIcon />
        </span>
      </button>
    </div>
  );
}

export function AriaDiaStory({
  chapter,
  chat,
  stage,
  setStage,
  progress,
  setProgress,
  headingRef,
  onContinue,
}: {
  chapter: AriaChapter;
  chat: NonNullable<AriaChapter["chat"]>;
  stage: DiaStage;
  setStage: Dispatch<SetStateAction<DiaStage>>;
  progress: DiaProgress;
  setProgress: Dispatch<SetStateAction<DiaProgress>>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onContinue: () => void;
}) {
  const answer = useRef<HTMLHeadingElement>(null);
  const sentFromComposer = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const browserLength = chapter.paragraphs.join("").length;
  const buildingLength = chat.reveal.join("").length;
  const browsersComplete = progress.browsers >= browserLength;
  const buildingComplete = progress.building >= buildingLength;
  const activeReply = stage === "typing" ? null : stage;
  const replyLength = stage === "building" ? buildingLength : browserLength;
  const replyComplete =
    stage === "building" ? buildingComplete : browsersComplete;

  useEffect(() => {
    if (!activeReply || replyComplete) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tick = setInterval(() => {
      setProgress((current) => ({
        ...current,
        [activeReply]: motion.matches
          ? replyLength
          : Math.min(current[activeReply] + 48, replyLength),
      }));
    }, 64);
    return () => clearInterval(tick);
  }, [activeReply, replyLength, replyComplete, setProgress]);

  useLayoutEffect(() => {
    if (followOutput.current && transcript.current) {
      transcript.current.scrollTop = transcript.current.scrollHeight;
    }
  }, [progress, stage]);

  useEffect(() => {
    if (stage !== "building" || !sentFromComposer.current) return;
    sentFromComposer.current = false;
    const frame = requestAnimationFrame(() => {
      answer.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  return (
    <section
      className={styles.chat}
      role="tabpanel"
      id="aria-story-panel"
      aria-labelledby={`aria-tab-${chapter.id}`}
    >
      <h2
        className="sr-only"
        ref={headingRef}
        tabIndex={-1}
        data-project-heading
      >
        &quot;Dia&quot;
      </h2>
      {stage === "typing" ? (
        <DiaIntro prompt={chat.prompt} setStage={setStage} />
      ) : (
        <>
          <div
            className={styles.transcript}
            ref={transcript}
            onScroll={(event) => {
              const { scrollHeight, scrollTop, clientHeight } =
                event.currentTarget;
              followOutput.current =
                scrollHeight - scrollTop - clientHeight < 64;
            }}
          >
            <div className={styles.conversation}>
              <div className={styles.question}>
                <span className="sr-only">You: </span>
                {chat.prompt}
              </div>
              <div className={styles.response} aria-busy={!browsersComplete}>
                <div className={styles.brand}>
                  <Sparkle />
                  <span>&quot;Dia&quot;</span>
                </div>
                <TypedParagraphs
                  paragraphs={chapter.paragraphs}
                  characters={progress.browsers}
                  complete={browsersComplete}
                />
              </div>
              {stage === "building" && (
                <div className={styles.reveal}>
                  <div className={styles.question}>
                    <span className="sr-only">You: </span>
                    {chat.followUp}
                  </div>
                  <div
                    className={styles.response}
                    aria-busy={!buildingComplete}
                  >
                    <div className={styles.brand}>
                      <Sparkle />
                      <span>&quot;Dia&quot;</span>
                    </div>
                    <h3 ref={answer} tabIndex={-1}>
                      Building my own browser
                    </h3>
                    <TypedParagraphs
                      paragraphs={chat.reveal}
                      characters={progress.building}
                      complete={buildingComplete}
                    />
                    {buildingComplete && (
                      <div className={styles.suggestion}>
                        <span>A different foundation</span>
                        <button onClick={onContinue}>
                          {chapter.continuation}
                          <span aria-hidden="true">↗</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <span className="sr-only" role="status">
            {replyComplete
              ? '"Dia"’s response is ready.'
              : '"Dia" is responding…'}
          </span>
          {stage === "browsers" && (
            <div className={styles.bottomComposer}>
              <button
                className={styles.composer}
                type="button"
                aria-label={`Send: ${chat.followUp}`}
                disabled={!browsersComplete}
                onClick={() => {
                  followOutput.current = true;
                  sentFromComposer.current = true;
                  setStage("building");
                }}
              >
                <span className={styles.typing}>{chat.followUp}</span>
                <span className={styles.sendIcon} aria-hidden="true">
                  <SendIcon />
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
