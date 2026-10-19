export type AriaChapter = {
  id: string;
  title: string;
  theme: "aria" | "chrome" | "arc" | "dia" | "safari";
  paragraphs: string[];
  continuation?: string;
  chat?: { prompt: string; followUp: string; reveal: string[] };
};

export const ariaChapters: AriaChapter[] = [
  {
    id: "about",
    continuation: "It all began with Google Chrome.",
    title: "About Aria",
    theme: "aria",
    paragraphs: [
      "Aria is a simple, minimal browser for macOS. A thin bezel frames the web page, leaving almost the entire window for what you came to read or use. There is no permanent row of tabs or address bar taking up space above it.",
      "Tabs, bookmarks, and navigation are tucked into a sidebar on the left. Move your pointer to the edge of the window and the sidebar slides into view; move back to the page and it slips away. The controls stay within reach without needing to be on screen all the time.",
      "Opening a new tab follows the same idea. Command + T brings up a URL and search input over the current page, keeping what you were reading in view until you press Enter. Built with SwiftUI and WebKit, Aria focuses on the everyday experience of browsing on my Mac, without adding profiles, split tabs, AI features, or a busy home page.",
    ],
  },
  {
    id: "chrome",
    continuation: "Then I discovered Arc.",
    title: "Google Chrome",
    theme: "chrome",
    paragraphs: [
      "Google Chrome was my default browser for years. It felt like the natural starting point: familiar, widely used, and closely connected to the Google services I used every day.",
      "Google built Chrome for a web that was becoming more than a collection of documents. Applications such as Gmail and Google Docs needed a browser that could run increasingly demanding software. Investment in performance, stability, and browser capabilities helped those applications—and the wider web—do more.",
      "Chrome is the browser; Chromium is the open-source browser project behind it. Its rendering engine is Blink, which turns web content into the pages we see. That distinction matters because Chromium gives other browser makers a shared foundation, while leaving room for different interfaces and features.",
      "I tried Chromium-based alternatives like Brave and Opera GX, but their extra features never outweighed the small annoyances that eventually sent me back to Chrome. A different browser needed to improve the way I browsed, rather than simply give me more features.",
    ],
  },
  {
    id: "arc",
    continuation:
      "But then The Browser Company killed Arc for their new browser Dia.",
    title: "Discovering Arc",
    theme: "arc",
    paragraphs: [
      "Arc was the first browser that changed that. Its startup animation and sound caught my attention, but the interface was what made me stay. The web page occupied almost the entire window, framed by a narrow border. Tabs, bookmarks, and navigation lived in a left sidebar that appeared when I needed it.",
      "Even opening a tab felt different. Pressing Command + T brought up an input panel over the current page. I could enter a URL or search without leaving what I was reading, and a new tab only opened when I pressed Enter. It was a small interaction, but it made me realise how much of the conventional browser interface I had accepted without questioning.",
    ],
  },
  {
    id: "dia",
    continuation: "What about Safari and WebKit?",
    title: '"Dia"',
    theme: "dia",
    paragraphs: [
      "When The Browser Company shifted its attention toward Dia, I started looking again. Arc still worked, but I was uncomfortable relying on a browser whose future felt uncertain. I tried Vivaldi, Zen, and other alternatives. Some lacked the minimal interface I wanted; others introduced compatibility problems on pages I used.",
      "That search helped me define a surprisingly short checklist: an unobtrusive interface, a hidden left sidebar, and an overlay for opening tabs. I didn’t need profiles, split tabs, AI features, or a home page full of information. I wanted space for the web page.",
    ],
    chat: {
      prompt: "What browsers could I try?",
      followUp: "What if I build my own?",
      reveal: [
        "Eventually, I decided to build that browser myself.",
        "Chromium was my first choice. I downloaded the source and began trying to compile it, but after several hours, I realised that working with the full browser codebase was a much larger undertaking than the interface changes I wanted to make.",
        "I explored Electron and Chromium Embedded Framework next. Electron offered a familiar route, but it felt unnecessarily complicated for something I intended to use on my own Mac. Cross-platform support wasn’t a priority.",
      ],
    },
  },
  {
    id: "safari",
    continuation: "I set Aria as my default browser.",
    title: "Safari & WebKit",
    theme: "safari",
    paragraphs: [
      "That led me to Swift, SwiftUI, and WebKit. Using macOS’s native interface tools and bundled web engine felt like a better fit.",
      "While experimenting with WebKit, I discovered another interaction that gave me the same feeling I’d had when first using Arc: swiping through browsing history. With a two-finger gesture, the current page slides away to reveal the previous page underneath. Moving forward brings the next page back into view. History felt like a stack of pages I could move through directly.",
      "That interaction helped settle the direction for Aria.",
    ],
  },
  {
    id: "daily-use",
    title: "Designing through daily use",
    theme: "aria",
    paragraphs: [
      "Building my own browser meant I could change every small behaviour that bothered me. It also meant discovering why seemingly unnecessary interface details sometimes exist.",
      "I tried removing the border around the page entirely. It looked cleaner, but made the window’s resize corner less apparent and left no clear area for revealing the sidebar. Keeping a border along just one edge felt visually unbalanced. Those experiments helped me find a balance between giving the page more space and keeping the window comfortable to use.",
      "The new-tab panel became another place to work through details: how autocomplete should behave, where suggestions should appear, and how to keep the interaction predictable.",
      "Using Aria every day became part of the design process. Repeated actions exposed friction that I hadn’t noticed while building. I could make a change, live with it, and decide whether it actually improved browsing.",
      "That has been the most rewarding part of the project. Aria began with a few interface preferences, but building it taught me how much care sits inside a simple browser—and gave me a way to keep shaping those details around my own use.",
    ],
  },
];
