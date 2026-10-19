"use client";

import HistoricalExample from "./historical-example";
import styles from "./visionverse-story.module.css";

export default function VisionVerseStory() {
  return (
    <div className={styles.story}>
      <section id="visionverse-html" className={styles.chapter}>
        <div className={styles.chapterCopy}>
          <span className={styles.chapterNumber}>01</span>
          <h2>Building the quiz with HTML</h2>
          <p>
            VisionVerse began as an industry placement activity that I continued
            during my internship. My first concern was how a quiz would fit all
            the different phone screens people might use.
          </p>
          <p>
            HTML felt like a natural starting point. A text component could map
            to a paragraph element, and changing its appearance would mean
            editing CSS. I could reuse what I already knew and build on a format
            that browsers across devices already understand.
          </p>
          <p>
            A saved page would describe its components, their content, and the
            CSS attached to each one. The renderer could then create those
            elements and apply their styles directly. Rows and columns composed
            the layout; editing changed the data behind it.
          </p>
        </div>

        <HistoricalExample revision="html" />
        <p className={styles.caption}>
          The HTML editor from June 2025, running with a local sample quiz.
          Component controls, phone previews, and page navigation come from the
          original revision.
        </p>

        <div className={styles.storyDetail}>
          <div className={styles.detailCopy}>
            <h3>A preview that keeps its proportions</h3>
            <p>
              The preview needed to show the layout someone would actually see
              on a phone. Squeezing it into the editor’s available width would
              change line breaks and spacing, making it a poor reference.
            </p>
            <p>
              Instead, I gave the phone preview a defined pixel width and
              height, then scaled the whole preview to fit the editor. A 390 ×
              844 page still lays out at 390 × 844, even when displayed smaller.
              Choosing another phone size changes the viewport; resizing the
              editor only changes the zoom. Sharing the renderer with the quiz
              player keeps the preview and final quiz consistent at the same
              viewport size.
            </p>
          </div>
        </div>

        <div className={styles.storyDetail}>
          <div className={styles.detailCopy}>
            <h3>Keeping edits live with Convex</h3>
            <p>
              I wanted editing to feel continuous. An extra Save button is easy
              to forget, and waiting for a polling refresh leaves me wondering
              whether a change has made it through. Convex handles the database
              and pushes updated query results over WebSockets, so the interface
              can follow changes as they happen.
            </p>
            <p>
              Discovering optimistic updates made the interaction feel much
              smoother. The editor can update its local query data immediately
              while the mutation is sent to the server, then reconcile with the
              confirmed result. Moving or editing a component no longer needs to
              wait for a round trip to feel responsive.
            </p>
            <p>
              That also made shared editing an interesting next step: a live
              data layer to build collaboration on, with the collaboration
              behaviour itself still to design.
            </p>
            <a
              className={styles.referenceLink}
              href="https://docs.convex.dev/client/react/optimistic-updates"
              target="_blank"
              rel="noreferrer"
            >
              Convex optimistic updates ↗
            </a>
          </div>
        </div>
      </section>

      <section id="visionverse-canvas" className={styles.chapter}>
        <div className={styles.chapterCopy}>
          <span className={styles.chapterNumber}>02</span>
          <h2>Moving to Fabric.js</h2>
          <p>
            As I worked on the editor, differences between phone sizes started
            to feel less like a reason to build everything around HTML. I was
            spending more effort creating the editing surface itself, and wanted
            to explore what a canvas could offer.
          </p>
          <p>
            Experimenting with Fabric.js gave me text, shapes, and objects that
            could be moved, resized, and rotated directly. It also opened up
            drawing and pen tools without having to build my own canvas editor
            from scratch.
          </p>
          <p>
            The saved page became a canvas scene, with quiz actions attached to
            its objects. That let me focus on how someone designs and plays a
            quiz, while Fabric.js provided the foundations for manipulating the
            design.
          </p>
        </div>
        <HistoricalExample revision="fabric" />
        <p className={styles.caption}>
          The Fabric.js editor from September 2026, with its original layer
          panel, drawing tools, and selection menus. Edits stay in this example;
          Preview quiz uses the original scene renderer.
        </p>
        <div className={styles.closing}>
          <ul aria-label="Technologies">
            <li>React</li>
            <li>TypeScript</li>
            <li>Fabric.js</li>
            <li>Convex</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
