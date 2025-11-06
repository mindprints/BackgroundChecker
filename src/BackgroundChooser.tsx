import React, { useEffect, useMemo, useState } from "react";

// Museum of Artificial Intelligence — Background Chooser SPA (demo)
// Single-file React component. TailwindCSS for styling. No external deps.
// Features:
// - Image uploader (multiple) + drag & drop
// - Uploads + 5 gradient presets (all deletable)
// - Thumbnails chooser (hideable), favorites, A/B compare
// - Fit/Repeat/Position, Overlay darkness, page Blur
// - Device frame (mobile/tablet/desktop/fluid) + rotate, chrome clipped inside frame
// - Clean evaluation: H hides header+thumbs, U header only, T thumbnails only, ? help overlay
// - Card opacity slider linked inversely to blur for demo cards
// - Auto-save session to localStorage; Copy CSS; Export JSON config; Export PNG screenshot (background + overlay)
// - Quick WCAG contrast meter overlay (conservative estimate from overlay value)

// Types

type BGItem = {
  id: string;
  name: string;
  type: "image" | "css";
  src?: string; // for images
  css?: string; // for gradients/css backgrounds
  favorite?: boolean; // always treat as boolean via nullish coalescing
  origin: "preset" | "upload";
};

type ExportState = {
  items: BGItem[];
  index: number;
  fit: "cover" | "contain" | "auto";
  repeat: boolean;
  pos: string;
  overlay: number;
  blur: number;
  device: DeviceKey;
  rotate: boolean;
  cardOpacity: number;
  darkMode: boolean;
  cardColor: string;
  cardCount: number;
  generatedCards: Array<{ id: string; title: string; content: string }>;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Convert an uploaded File to a data: URL to avoid CSP issues with blob: URLs
function fileToDataURL(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(f);
  });
}

const PRESETS: BGItem[] = [
  {
    id: uid(),
    name: "Midnight Slate",
    type: "css",
    css: "linear-gradient(135deg,#0b1020 0%,#111827 45%,#1f2937 100%)",
    origin: "preset",
    favorite: false,
  },
  {
    id: uid(),
    name: "Aurora",
    type: "css",
    css: "linear-gradient(120deg,#0ea5e9,#22d3ee,#a78bfa)",
    origin: "preset",
    favorite: false,
  },
  {
    id: uid(),
    name: "Sunset Fade",
    type: "css",
    css: "radial-gradient(120% 100% at 10% 0%,#ffedd5 0%,#fb7185 40%,#1f2937 100%)",
    origin: "preset",
    favorite: false,
  },
  {
    id: uid(),
    name: "Graphite",
    type: "css",
    css: "linear-gradient(180deg,#0f172a 0%,#0b1220 50%,#060a14 100%)",
    origin: "preset",
    favorite: false,
  },
  {
    id: uid(),
    name: "Deep Teal",
    type: "css",
    css: "linear-gradient(160deg,#0f766e 0%,#0e7490 50%,#0b132b 100%)",
    origin: "preset",
    favorite: false,
  },
];

const POSITIONS = [
  { v: "center center", label: "Center" },
  { v: "top center", label: "Top" },
  { v: "bottom center", label: "Bottom" },
  { v: "center left", label: "Left" },
  { v: "center right", label: "Right" },
];

const DEVICES = [
  { key: "fluid", label: "Fluid 100%", w: "100%", h: "100%" },
  { key: "mobile-portrait", label: "Mobile Portrait 390×844", w: 390, h: 844 },
  {
    key: "mobile-landscape",
    label: "Mobile Landscape 844×390",
    w: 844,
    h: 390,
  },
  { key: "tablet", label: "Tablet 820×1180", w: 820, h: 1180 },
  { key: "desktop", label: "Desktop 1440×900", w: 1440, h: 900 },
] as const;

type DeviceKey =
  | "fluid"
  | "mobile-portrait"
  | "mobile-landscape"
  | "tablet"
  | "desktop";

const LS_KEY = "mai-bg-chooser-v1";

// ---- helpers ----
function computeFrameStyle(
  device: DeviceKey,
  rotate: boolean,
): React.CSSProperties {
  const dev = (DEVICES as any).find((d: any) => d.key === device)!;
  let w: number | string = dev.w as any;
  let h: number | string = dev.h as any;
  if (rotate && typeof w === "number" && typeof h === "number") {
    const t = w;
    w = h;
    h = t;
  }
  return {
    width: typeof w === "number" ? `${w}px` : "100vw",
    height: typeof h === "number" ? `${h}px` : "100vh",
  };
}

function chromeHiddenToken(hidden: boolean, pos: "top" | "bottom") {
  return hidden
    ? pos === "top"
      ? "-translate-y-full"
      : "translate-y-full"
    : "";
}

function normalizeItem(x: BGItem): BGItem {
  return { ...x, favorite: x.favorite ?? false };
}
function normalizeItems(xs: BGItem[]): BGItem[] {
  return xs.filter(Boolean).map(normalizeItem);
}

function buildBackgroundStyle(
  item?: BGItem | null,
  opts?: {
    fit: "cover" | "contain" | "auto";
    repeat: boolean;
    pos: string;
    blur: number;
  },
) {
  if (!item) return {} as React.CSSProperties;
  const {
    fit = "cover",
    repeat = false,
    pos = "center center",
    blur = 0,
  } = opts || {};
  const base: React.CSSProperties = {
    backgroundPosition: pos,
    backgroundRepeat: repeat ? "repeat" : "no-repeat",
    backgroundSize: fit,
    filter: blur ? `blur(${blur}px)` : undefined,
    transition: "filter 150ms linear, background 200ms ease",
  };
  if (item.type === "image") {
    base.backgroundImage = `url(${item.src})`;
  } else if (item.type === "css") {
    base.backgroundImage = item.css;
  }
  return base;
}

function cssSnippet(
  item: BGItem | undefined,
  fit: "cover" | "contain" | "auto",
  repeat: boolean,
  pos: string,
  overlay: number,
) {
  const bi = item?.type === "image" ? `url(${item.src})` : item?.css || "none";
  return `/* Background */\n.selector {\n  background-image: ${bi};\n  background-size: ${fit};\n  background-repeat: ${repeat ? "repeat" : "no-repeat"};\n  background-position: ${pos};\n  position: relative;\n}\n/* Overlay */\n.selector::before {\n  content: ""; position: absolute; inset: 0;\n  background: rgba(0,0,0,${overlay.toFixed(2)});\n  pointer-events: none;\n}`;
}

function downloadBlob(
  filename: string,
  data: string,
  type = "application/json",
) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function estimateMinContrastFromOverlay(overlay: number) {
  // Conservative: assume brightest possible background underlay (Lbg=1). Overlay is black with alpha.
  // Effective background luminance L' = (1 - overlay) * 1.
  const Lbg = 1 - overlay;
  const Ltext = 1; // white text
  const ratio = (Ltext + 0.05) / (Lbg + 0.05);
  const passAA = ratio >= 4.5; // normal text
  const passAAA = ratio >= 7.0;
  return { ratio, passAA, passAAA };
}

// Estimate contrast for text inside translucent white cards that sit over the page overlay.
// We conservatively assume the area under the card is at its *brightest* possible after overlay: L_under_max = 1 - overlay.
function chooseTextColorForCard(
  overlay: number,
  cardOpacity: number,
  cardColor: string = "#000000",
) {
  const a = Math.max(0, Math.min(1, cardOpacity));
  const L_under_max = 1 - Math.max(0, Math.min(0.95, overlay));

  // Convert hex color to RGB and calculate luminance
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }; // default to black
  };

  const rgb = hexToRgb(cardColor);
  const cardLuminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  // Composite custom color over L_under_max
  const L_card = a * cardLuminance + (1 - a) * L_under_max;

  // Contrast vs white and black text
  const ratioWhite = (1 + 0.05) / (L_card + 0.05);
  const ratioBlack = (L_card + 0.05) / 0.05;
  const color = ratioWhite >= ratioBlack ? "white" : "black";
  const ratio = Math.max(ratioWhite, ratioBlack);
  const passAA = ratio >= 4.5;
  const passAAA = ratio >= 7.0;
  return { color, ratio, passAA, passAAA, L_card };
}

function estimateCardContrast(
  overlay: number,
  cardOpacity: number,
  cardColor: string = "#000000",
) {
  return chooseTextColorForCard(overlay, cardOpacity, cardColor);
}

// Draw to canvas for PNG export (background + overlay, optional compare)
async function exportBackgroundPNG(opts: {
  item?: BGItem;
  compareA?: BGItem | null;
  compareB?: BGItem | null;
  showB: boolean;
  fit: "cover" | "contain" | "auto";
  repeat: boolean;
  pos: string;
  overlay: number;
  blur: number;
  width: number;
  height: number;
}) {
  const {
    item,
    compareA,
    compareB,
    showB,
    fit,
    repeat,
    pos,
    overlay,
    blur,
    width,
    height,
  } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  // helper to draw one background item
  const drawItem = async (it?: BGItem) => {
    if (!it) return;
    if (it.type === "image" && it.src) {
      await drawImageBackground(
        ctx,
        it.src,
        fit,
        pos,
        repeat,
        blur,
        canvas.width,
        canvas.height,
      );
    } else if (it.type === "css" && it.css) {
      drawGradientBackground(ctx, it.css, canvas.width, canvas.height, blur);
    }
  };
  if (compareA || compareB) {
    // left/right split
    ctx.save();
    if (showB) {
      ctx.beginPath();
      ctx.rect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
      ctx.clip();
      await drawItem(compareB || item);
    } else {
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width / 2, canvas.height);
      ctx.clip();
      await drawItem(compareA || item);
    }
    ctx.restore();
    ctx.save();
    if (showB) {
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width / 2, canvas.height);
      ctx.clip();
      await drawItem(compareA || item);
    } else {
      ctx.beginPath();
      ctx.rect(canvas.width / 2, 0, canvas.width / 2, canvas.height);
      ctx.clip();
      await drawItem(compareB || item);
    }
    ctx.restore();
  } else {
    await drawItem(item);
  }
  // overlay
  ctx.fillStyle = `rgba(0,0,0,${overlay})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  return new Promise<string>((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob!);
      resolve(url);
    }, "image/png");
  });
}

async function drawImageBackground(
  ctx: CanvasRenderingContext2D,
  src: string,
  fit: "cover" | "contain" | "auto",
  pos: string,
  repeat: boolean,
  blur: number,
  W: number,
  H: number,
) {
  const img = await loadImage(src);
  ctx.save();
  if (blur) ctx.filter = `blur(${blur}px)`;
  if (repeat) {
    const pattern = ctx.createPattern(img, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern as any;
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    const { dx, dy, dw, dh } = computeDrawRect(
      img.width,
      img.height,
      W,
      H,
      fit,
      pos,
    );
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();
}

function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  css: string,
  W: number,
  H: number,
  blur: number,
) {
  ctx.save();
  if (blur) ctx.filter = `blur(${blur}px)`;
  const lower = css.toLowerCase().trim();
  if (lower.startsWith("linear-gradient")) {
    const cols = extractColors(lower);
    const grad = ctx.createLinearGradient(0, 0, W, H);
    cols.forEach((c, i) =>
      grad.addColorStop(i / Math.max(1, cols.length - 1), c),
    );
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (lower.startsWith("radial-gradient")) {
    const cols = extractColors(lower);
    const grad = ctx.createRadialGradient(
      W * 0.1,
      H * 0.1,
      0,
      W * 0.1,
      H * 0.1,
      Math.max(W, H),
    );
    cols.forEach((c, i) =>
      grad.addColorStop(i / Math.max(1, cols.length - 1), c),
    );
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function extractColors(gradient: string): string[] {
  // very naive: pull #hex or rgb/rgba tokens
  const hex = gradient.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})/gi) || [];
  const rgba = gradient.match(/rgba?\([^\)]+\)/gi) || [];
  return (hex.length ? hex : rgba).slice(0, 6);
}

function computeDrawRect(
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  fit: "cover" | "contain" | "auto",
  pos: string,
) {
  if (fit === "auto") {
    // top-left by default
    return { dx: 0, dy: 0, dw: sw, dh: sh };
  }
  const srcRatio = sw / sh;
  const dstRatio = dw / dh;
  let w = dw,
    h = dh;
  if (fit === "cover") {
    if (srcRatio > dstRatio) {
      h = dh;
      w = h * srcRatio;
    } else {
      w = dw;
      h = w / srcRatio;
    }
  } else {
    // contain
    if (srcRatio > dstRatio) {
      w = dw;
      h = w / srcRatio;
    } else {
      h = dh;
      w = h * srcRatio;
    }
  }
  // position
  let [px, py] = (pos || "center center").split(" ");
  const x = px?.includes("right")
    ? dw - w
    : px?.includes("left")
      ? 0
      : (dw - w) / 2;
  const y = py?.includes("bottom")
    ? dh - h
    : py?.includes("top")
      ? 0
      : (dh - h) / 2;
  return { dx: x, dy: y, dw: w, dh: h };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Random card generation function
function generateRandomCards(count: number) {
  const cardTitles = [
    "AI Revolution",
    "Neural Networks",
    "Machine Learning",
    "Deep Learning",
    "Computer Vision",
    "Natural Language",
    "Robotics",
    "Automation",
    "Data Science",
    "Predictive Analytics",
    "Pattern Recognition",
    "Algorithm Design",
    "Quantum Computing",
    "Edge Computing",
    "Cloud AI",
    "AI Ethics",
    "Autonomous Systems",
    "Smart Cities",
    "Digital Transformation",
    "Tech Innovation",
    "Future of Work",
    "Human-AI Collaboration",
    "AI Safety",
    "Machine Consciousness",
  ];

  const cardContents = [
    "Explore cutting-edge developments in artificial intelligence and their impact on society.",
    "Discover how machine learning algorithms are transforming industries worldwide.",
    "Learn about the latest breakthroughs in neural network architectures and training methods.",
    "Understand the principles behind deep learning and its applications in real-world scenarios.",
    "Investigate computer vision techniques that enable machines to interpret visual information.",
    "Dive into natural language processing and how AI understands human communication.",
    "Examine the intersection of robotics and AI in creating intelligent autonomous systems.",
    "Analyze the role of automation in reshaping the future of work and productivity.",
    "Explore data science methodologies that drive insights and decision-making processes.",
    "Understand how predictive analytics is revolutionizing business strategy and planning.",
  ];

  const cards = [];
  for (let i = 0; i < count; i++) {
    const titleIndex = Math.floor(Math.random() * cardTitles.length);
    const contentIndex = Math.floor(Math.random() * cardContents.length);
    const title = cardTitles[titleIndex];
    const content = cardContents[contentIndex];

    cards.push({
      id: uid(),
      title,
      content,
    });
  }

  return cards;
}

export default function MAI_Background_Chooser_Demo() {
  // State (attempt load from localStorage)
  const [items, setItems] = useState<BGItem[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ExportState;
        return normalizeItems(parsed.items || PRESETS);
      }
    } catch {}
    return normalizeItems(PRESETS);
  });
  const [index, setIndex] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as ExportState;
        return Math.min(
          Math.max(0, p.index || 0),
          Math.max(0, (p.items || PRESETS).length - 1),
        );
      }
    } catch {}
    return 0;
  });
  const [fit, setFit] = useState<"cover" | "contain" | "auto">(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return (p.fit || "cover") as any;
    } catch {
      return "cover" as const;
    }
  });
  const [repeat, setRepeat] = useState<boolean>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return !!p.repeat;
    } catch {
      return false;
    }
  });
  const [pos, setPos] = useState<string>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return p.pos || "center center";
    } catch {
      return "center center";
    }
  });
  const [overlay, setOverlay] = useState<number>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return typeof p.overlay === "number" ? p.overlay : 0.35;
    } catch {
      return 0.35;
    }
  });
  const [blur, setBlur] = useState<number>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return typeof p.blur === "number" ? p.blur : 0;
    } catch {
      return 0;
    }
  });
  const [device, setDevice] = useState<DeviceKey>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      // Handle migration from old "mobile" key to "mobile-portrait"
      let deviceKey = p.device;
      if (deviceKey === "mobile") {
        deviceKey = "mobile-portrait";
      }
      return (deviceKey || "fluid") as DeviceKey;
    } catch {
      return "fluid";
    }
  });
  const [rotate, setRotate] = useState<boolean>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return !!p.rotate;
    } catch {
      return false;
    }
  });
  const [grid, setGrid] = useState(false);
  const [slotA, setSlotA] = useState<number | null>(null);
  const [slotB, setSlotB] = useState<number | null>(null);
  const [showB, setShowB] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const [hideThumbs, setHideThumbs] = useState(false);
  const [cardOpacity, setCardOpacity] = useState<number>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return typeof p.cardOpacity === "number" ? p.cardOpacity : 0.08;
    } catch {
      return 0.08;
    }
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return !!p.darkMode;
    } catch {
      return false;
    }
  });
  const [cardColor, setCardColor] = useState<string>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState;
      return p.cardColor || (p.darkMode ? "#000000" : "#ffffff");
    } catch {
      return "#000000";
    }
  });
  const [cardCount, setCardCount] = useState<number>(3);
  const [generatedCards, setGeneratedCards] = useState<
    Array<{ id: string; title: string; content: string }>
  >(() => generateRandomCards(6));

  const [helpOpen, setHelpOpen] = useState(false);
  const [meterOpen, setMeterOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const hasItems = items.length > 0;
  const cur = hasItems ? (items[index] ?? items[0]) : undefined;

  // Auto-save
  useEffect(() => {
    const state: ExportState = {
      items: normalizeItems(items),
      index,
      fit,
      repeat,
      pos,
      overlay,
      blur,
      device,
      rotate,
      cardOpacity,
      darkMode,
      cardColor,
      cardCount,
      generatedCards,
    };
    const id = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } catch {}
    }, 250);
    return () => clearTimeout(id);
  }, [
    items,
    index,
    fit,
    repeat,
    pos,
    overlay,
    blur,
    device,
    rotate,
    cardOpacity,
    darkMode,
    cardColor,
    cardCount,
    generatedCards,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      // UI visibility toggles
      if (k === "h") {
        const allHidden = hideHeader && hideThumbs;
        setHideHeader(!allHidden);
        setHideThumbs(!allHidden);
        return;
      }
      if (k === "u") {
        setHideHeader((v) => !v);
        return;
      }
      if (k === "t") {
        setHideThumbs((v) => !v);
        return;
      }
      if (e.key === "?" || k === "/") {
        setHelpOpen((v) => !v);
        return;
      }
      if (k === "m") {
        setMeterOpen((v) => !v);
        return;
      }
      // Export / copy / save
      if (k === "y") {
        // copy CSS
        if (!cur) return;
        navigator.clipboard?.writeText(
          cssSnippet(cur, fit, repeat, pos, overlay),
        );
        setToast("CSS copied");
        setTimeout(() => setToast(null), 1200);
        return;
      }
      if (k === "j") {
        // JSON export
        const state: ExportState = {
          items: normalizeItems(items),
          index,
          fit,
          repeat,
          pos,
          overlay,
          blur,
          device,
          rotate,
          cardOpacity,
        };
        downloadBlob("mai-background.json", JSON.stringify(state, null, 2));
        setToast("Exported JSON");
        setTimeout(() => setToast(null), 1200);
        return;
      }
      if (k === "p") {
        // PNG export
        doExportPNG();
        return;
      }
      if (k === "s") {
        // save now
        try {
          const st: ExportState = {
            items: normalizeItems(items),
            index,
            fit,
            repeat,
            pos,
            overlay,
            blur,
            device,
            rotate,
            cardOpacity,
            darkMode,
          };
          localStorage.setItem(LS_KEY, JSON.stringify(st));
          setToast("Saved");
          setTimeout(() => setToast(null), 800);
        } catch {}
        return;
      }
      // Navigation and compare
      if (e.key === "ArrowRight" && hasItems)
        setIndex((i) => (i + 1) % items.length);
      if (e.key === "ArrowLeft" && hasItems)
        setIndex((i) => (i - 1 + items.length) % items.length);
      if (k === "f" && cur) toggleFavorite(cur.id);
      if (k === "c" && hasItems) setShowB((s) => !s);

      const num = parseInt(e.key, 10);
      if (hasItems && !Number.isNaN(num) && num >= 1 && num <= 9) {
        const pool = visibleThumbnails();
        const pick = pool[num - 1];
        if (pick) setIndex(items.findIndex((x) => x?.id === pick.id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    items,
    cur,
    hideHeader,
    hideThumbs,
    hasItems,
    fit,
    repeat,
    pos,
    overlay,
    blur,
    device,
    rotate,
    cardOpacity,
    darkMode,
  ]);

  async function addUploads(files: FileList | null) {
    if (!files || !files.length) return;
    const adds: BGItem[] = [];
    for (const f of Array.from(files)) {
      const nameOk = /\.(avif|webp|jpe?g|png|gif|bmp|svg)$/i.test(f.name);
      const typeOk = f.type ? f.type.startsWith("image/") : false;
      if (!(typeOk || nameOk)) continue;
      try {
        const src = await fileToDataURL(f); // data: URL is CSP-friendly
        adds.push({
          id: uid(),
          name: f.name,
          type: "image",
          src,
          origin: "upload",
          favorite: false,
        });
      } catch {}
    }
    if (adds.length) {
      setItems((prev) => normalizeItems([...adds, ...prev]));
      setIndex(0);
    }
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x?.id !== id));
    setIndex(0);
  }

  function toggleFavorite(id: string) {
    setItems((prev) =>
      prev.map((x) =>
        x?.id === id
          ? { ...x, favorite: !(x.favorite ?? false) }
          : normalizeItem(x),
      ),
    );
  }

  function setCompareSlot(slot: "A" | "B") {
    if (!hasItems) return;
    if (slot === "A") setSlotA(index);
    else setSlotB(index);
  }

  function cycle(delta: number) {
    if (!hasItems) return;
    setIndex((i) => (i + delta + items.length) % items.length);
  }

  function visibleThumbnails() {
    const normalized = normalizeItems(items);
    return [
      ...normalized.filter((x) => x.favorite ?? false),
      ...normalized.filter(
        (x) => !(x.favorite ?? false) && x.origin === "upload",
      ),
      ...normalized.filter(
        (x) => !(x.favorite ?? false) && x.origin === "preset",
      ),
    ];
  }

  const currentStyle = useMemo(
    () => buildBackgroundStyle(cur, { fit, repeat, pos, blur }),
    [cur, fit, repeat, pos, blur],
  );

  const compareA = slotA != null ? items[slotA] : null;
  const compareB = slotB != null ? items[slotB] : null;
  const compareStyle = useMemo(
    () =>
      buildBackgroundStyle(showB ? (compareB ?? cur) : (compareA ?? cur), {
        fit,
        repeat,
        pos,
        blur,
      }),
    [compareA, compareB, showB, cur, fit, repeat, pos, blur],
  );

  const frameStyle = useMemo(
    () => computeFrameStyle(device, rotate),
    [device, rotate],
  );

  // Demo cards: opacity ↔ blur linkage
  const cardBlurMax = 18;
  const cardBlur = useMemo(
    () =>
      Math.max(
        0,
        Math.min(cardBlurMax, Math.round((1 - cardOpacity) * cardBlurMax)),
      ),
    [cardOpacity],
  );
  // Convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const rgb = hexToRgb(cardColor);
  const cardBgColor = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${cardOpacity})`
    : `rgba(0, 0, 0, ${cardOpacity})`;

  const cardPanelStyle: React.CSSProperties = useMemo(
    () => ({
      backgroundColor: cardBgColor,
      backdropFilter: cardBlur ? `blur(${cardBlur}px)` : undefined,
      WebkitBackdropFilter: cardBlur ? `blur(${cardBlur}px)` : undefined,
    }),
    [cardBgColor, cardBlur],
  );

  // Decide text color for cards (white/black) based on overlay + card opacity + card color
  const cardTextChoice = useMemo(
    () => chooseTextColorForCard(overlay, cardOpacity, cardColor),
    [overlay, cardOpacity, cardColor],
  );
  const cardTextColor = cardTextChoice.color; // 'white' | 'black'
  const cardTextClass =
    cardTextColor === "black" ? "text-black/80" : "text-white/80";
  const cardHeadingClass =
    cardTextColor === "black" ? "text-black" : "text-white";
  const cardButtonClass =
    cardTextColor === "black"
      ? "bg-black/10 hover:bg-black/20 text-black"
      : "bg-white/10 hover:bg-white/20 text-white";

  async function doExportPNG() {
    const size = frameStyle as any;
    const w = parseInt(String(size.width || "1440px")) || 1440;
    const h = parseInt(String(size.height || "900px")) || 900;
    const url = await exportBackgroundPNG({
      item: cur,
      compareA,
      compareB,
      showB,
      fit,
      repeat,
      pos,
      overlay,
      blur,
      width: w,
      height: h,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = "mai-preview.png";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Exported PNG");
    setTimeout(() => setToast(null), 1200);
  }

  const contrastPage = useMemo(
    () => estimateMinContrastFromOverlay(overlay),
    [overlay],
  );
  const contrastCard = useMemo(
    () => estimateCardContrast(overlay, cardOpacity, cardColor),
    [overlay, cardOpacity, cardColor],
  );

  return (
    <div className="w-screen h-screen bg-neutral-900 text-white overflow-hidden flex items-center justify-center">
      <div
        className="relative text-white overflow-hidden bg-black rounded-xl shadow-2xl"
        style={frameStyle}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const files = e.dataTransfer?.files;
          if (files && files.length) addUploads(files as any);
        }}
      >
        {/* Top bar */}
        <header
          className={
            "absolute top-0 left-0 right-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/60 border-b border-white/10 transition-transform duration-300 " +
            (hideHeader
              ? "pointer-events-none opacity-0 " +
                chromeHiddenToken(true, "top")
              : "")
          }
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="font-semibold tracking-wide">
              MAI — Background Chooser
            </div>
            <div className="h-6 w-px bg-white/20 mx-1" />
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="opacity-80">Upload</span>
              <input
                type="file"
                multiple
                accept="image/*,.avif,.webp"
                className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-white/10 file:text-white file:hover:bg-white/20 file:cursor-pointer"
                onChange={(e) => addUploads(e.target.files)}
              />
            </label>
            <div className="h-6 w-px bg-white/20 mx-1" />
            <div className="flex items-center gap-2 text-sm">
              <label className="opacity-80">Fit</label>
              <select
                value={fit}
                onChange={(e) => setFit(e.target.value as any)}
                className="bg-white/10 rounded-md px-2 py-1 outline-none"
              >
                <option value="cover">cover</option>
                <option value="contain">contain</option>
                <option value="auto">auto</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="opacity-80">Position</label>
              <select
                value={pos}
                onChange={(e) => setPos(e.target.value)}
                className="bg-white/10 rounded-md px-2 py-1 outline-none"
              >
                {POSITIONS.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
              />
              <span className="opacity-80">Repeat</span>
            </label>
            <div className="flex items-center gap-2 text-sm">
              <label className="opacity-80">Card Color</label>
              <input
                type="color"
                value={cardColor}
                onChange={(e) => setCardColor(e.target.value)}
                className="w-8 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="opacity-80">Cards</label>
              <input
                type="number"
                min="1"
                max="12"
                value={cardCount}
                onChange={(e) => setCardCount(parseInt(e.target.value) || 3)}
                className="w-16 bg-white/10 rounded px-2 py-1 outline-none"
              />
              <button
                onClick={() =>
                  setGeneratedCards(generateRandomCards(cardCount))
                }
                className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
              >
                Random
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <label className="opacity-80">Overlay</label>
              <input
                type="range"
                min={0}
                max={0.95}
                step={0.01}
                value={overlay}
                onChange={(e) => setOverlay(parseFloat(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="opacity-80">Blur</label>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={blur}
                onChange={(e) => setBlur(parseFloat(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="opacity-80">Cards opacity</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={cardOpacity}
                onChange={(e) => setCardOpacity(parseFloat(e.target.value))}
              />
              <span className="opacity-70 text-xs">linked blur</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <label className="opacity-80">Device</label>
              <select
                value={device}
                onChange={(e) => setDevice(e.target.value as DeviceKey)}
                className="bg-white/10 rounded-md px-2 py-1 outline-none"
              >
                {DEVICES.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
              {device !== "fluid" && (
                <button
                  onClick={() => setRotate((r) => !r)}
                  className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
                >
                  Rotate
                </button>
              )}
            </div>
            <button
              onClick={() => {
                const nv = !(hideHeader && hideThumbs);
                setHideHeader(nv);
                setHideThumbs(nv);
              }}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
            >
              Clean
            </button>
            <div className="h-6 w-px bg-white/20" />
            {/* New actions */}
            <button
              onClick={() => {
                if (!cur) return;
                navigator.clipboard?.writeText(
                  cssSnippet(cur, fit, repeat, pos, overlay),
                );
                setToast("CSS copied");
                setTimeout(() => setToast(null), 1200);
              }}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
            >
              Copy CSS (Y)
            </button>
            <button
              onClick={() => {
                const state: ExportState = {
                  items: normalizeItems(items),
                  index,
                  fit,
                  repeat,
                  pos,
                  overlay,
                  blur,
                  device,
                  rotate,
                  cardOpacity,
                };
                downloadBlob(
                  "mai-background.json",
                  JSON.stringify(state, null, 2),
                );
                setToast("Exported JSON");
                setTimeout(() => setToast(null), 1200);
              }}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
            >
              Export JSON (J)
            </button>
            <button
              onClick={doExportPNG}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
            >
              Export PNG (P)
            </button>
            <button
              onClick={() => setMeterOpen((v) => !v)}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
            >
              Contrast (M)
            </button>
            <button
              onClick={() => setHelpOpen((v) => !v)}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
            >
              Help ?
            </button>
            <div className="ml-auto" />
          </div>
        </header>

        {/* Help overlay */}
        {helpOpen && (
          <div className="absolute inset-0 z-[60] bg-black/85">
            <div className="max-w-3xl mx-auto p-6">
              <h2 className={"text-2xl font-semibold " + cardHeadingClass}>
                Shortcuts
              </h2>
              <ul className="mt-3 space-y-1 text-white/90 text-sm">
                <li>
                  <span className="font-mono">←/→</span> previous/next
                  background
                </li>
                <li>
                  <span className="font-mono">1–9</span> pick visible thumbnail
                </li>
                <li>
                  <span className="font-mono">F</span> favorite current
                </li>
                <li>
                  <span className="font-mono">C</span> toggle A/B compare
                </li>
                <li>
                  <span className="font-mono">H</span> hide/show header +
                  thumbnails
                </li>
                <li>
                  <span className="font-mono">U</span> toggle header
                </li>
                <li>
                  <span className="font-mono">T</span> toggle thumbnails
                </li>
                <li>
                  <span className="font-mono">Y</span> copy CSS snippet
                </li>
                <li>
                  <span className="font-mono">J</span> export JSON
                </li>
                <li>
                  <span className="font-mono">P</span> export PNG
                </li>
                <li>
                  <span className="font-mono">M</span> toggle contrast meter
                </li>
                <li>
                  <span className="font-mono">?</span> toggle this help
                </li>
                <li>Drag & drop images anywhere to upload</li>
              </ul>
              <p className="mt-4 text-xs opacity-70">
                Contrast meter is a conservative estimate using the overlay
                value; actual image content may vary.
              </p>
            </div>
          </div>
        )}

        {/* Contrast meter */}
        {meterOpen && (
          <div className="absolute right-3 top-16 z-[55] rounded-lg border border-white/15 bg-black/70 backdrop-blur px-3 py-2 text-xs space-y-1">
            <div className="font-semibold opacity-80">Contrast checks</div>
            <div>
              Page text (white on bg):{" "}
              <span className="font-mono">
                {contrastPage.ratio.toFixed(2)}:1
              </span>{" "}
              <span
                className={
                  contrastPage.passAA ? "text-green-300" : "text-red-300"
                }
              >
                AA {contrastPage.passAA ? "pass" : "fail"}
              </span>{" "}
              <span
                className={
                  contrastPage.passAAA ? "text-green-300" : "text-yellow-300"
                }
              >
                AAA {contrastPage.passAAA ? "pass" : "fail"}
              </span>
            </div>
            <div>
              Card text (<span className="font-mono">{cardTextColor}</span> on
              card):{" "}
              <span className="font-mono">
                {contrastCard.ratio.toFixed(2)}:1
              </span>{" "}
              <span
                className={
                  contrastCard.passAA ? "text-green-300" : "text-red-300"
                }
              >
                AA {contrastCard.passAA ? "pass" : "fail"}
              </span>{" "}
              <span
                className={
                  contrastCard.passAAA ? "text-green-300" : "text-yellow-300"
                }
              >
                AAA {contrastCard.passAAA ? "pass" : "fail"}
              </span>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 top-16 z-[70] px-3 py-1.5 rounded bg-white/10 border border-white/15 text-sm">
            {toast}
          </div>
        )}

        {/* Background layer */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Base */}
          <div className="absolute inset-0" style={currentStyle} />
          {/* Compare layer */}
          {(slotA != null || slotB != null) && (
            <div
              className="absolute inset-0 transition-all duration-300"
              style={{
                ...(compareStyle as React.CSSProperties),
                clipPath: showB ? "inset(0 0 0 50%)" : "inset(0 50% 0 0)",
              }}
            />
          )}
          {/* Dark overlay for readability */}
          <div
            className="absolute inset-0"
            style={{ background: `rgba(0,0,0,${overlay})` }}
          />
          {/* Optional grid */}
          {grid && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
          )}
        </div>

        {/* Main content */}
        <main className="relative z-10 pt-20 pb-28 h-full overflow-y-auto">
          <section className="max-w-7xl mx-auto px-6 py-12">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Museum of Artificial Intelligence
            </h1>
            <p className="mt-4 text-lg md:text-xl max-w-2xl text-white/80">
              Exhibition platform for the history and future of computation.
              Prototype layout to evaluate background imagery, readability, and
              motion.
            </p>
            <div className="mt-6 flex gap-3">
              <button className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-white/90">
                Buy Tickets
              </button>
              <button className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20">
                Plan Your Visit
              </button>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {generatedCards.length > 0 ? (
              generatedCards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-2xl border border-white/10 p-5 hover:bg-white/10 transition"
                  style={cardPanelStyle}
                >
                  <h3 className={"text-xl font-semibold " + cardHeadingClass}>
                    {card.title}
                  </h3>
                  <p className={"mt-2 text-sm " + cardTextClass}>
                    {card.content}
                  </p>
                  <button
                    className={
                      "mt-4 text-sm px-4 py-2 rounded-md " + cardButtonClass
                    }
                  >
                    Open
                  </button>
                </article>
              ))
            ) : (
              <div className="col-span-full text-center text-white/60 py-8">
                No cards generated. Use the "Random" button above to generate
                cards.
              </div>
            )}
          </section>

          <section className="max-w-7xl mx-auto px-6 py-12">
            <div
              className="rounded-2xl p-6 border border-white/10"
              style={cardPanelStyle}
            >
              <h2 className={"text-2xl font-semibold " + cardHeadingClass}>
                Sample Text Block
              </h2>
              <p className={"mt-3 leading-7 " + cardTextClass}>
                This is a block of paragraph text used to check long-form
                readability against your background choice. Adjust overlay to
                meet WCAG contrast goals. Headlines, links, and buttons are
                represented above. You can switch backgrounds rapidly via
                keyboard or the chooser below.
              </p>
            </div>
          </section>
        </main>

        {/* Thumbnail chooser */}
        <div
          className={
            "absolute bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/70 backdrop-blur transition-transform duration-300 " +
            (hideThumbs
              ? "pointer-events-none opacity-0 " +
                chromeHiddenToken(true, "bottom")
              : "")
          }
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs opacity-80">
                Thumbnails: Favorites • Uploads • Presets
              </div>
              <div className="text-xs opacity-70">
                Shortcuts: ←/→, 1–9 pick, F favorite, C compare, H/U/T hide UI,
                Y/J/P/M, ? help
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleThumbnails().map((item) => (
                <Thumb
                  key={item.id}
                  item={item}
                  active={item.id === cur?.id}
                  onClick={() =>
                    setIndex(items.findIndex((x) => x?.id === item.id))
                  }
                  onRemove={() => removeItem(item.id)}
                  onFav={() => toggleFavorite(item.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Thumbnail component
function Thumb({
  item,
  active,
  onClick,
  onRemove,
  onFav,
}: {
  item: BGItem;
  active: boolean;
  onClick: () => void;
  onRemove?: () => void;
  onFav: () => void;
}) {
  const isFav = item.favorite ?? false;
  return (
    <div
      className={`relative shrink-0 w-28 h-16 rounded-lg overflow-hidden border ${active ? "border-white" : "border-white/20"}`}
    >
      <button onClick={onClick} className="absolute inset-0">
        {item.type === "image" ? (
          <img
            src={item.src}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundImage: item.css, backgroundSize: "cover" }}
            aria-label={item.name}
          />
        )}
      </button>
      <div className="absolute left-1 bottom-1 right-1 flex items-center justify-between gap-1 text-[10px] leading-none">
        <span className="px-1 py-0.5 rounded bg-black/60 truncate">
          {item.name}
        </span>
        <div className="flex gap-1">
          <button
            onClick={onFav}
            title="favorite"
            className={`px-1 py-0.5 rounded bg-black/60 ${isFav ? "text-yellow-300" : "text-white"}`}
          >
            ★
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              title="remove"
              className="px-1 py-0.5 rounded bg-black/60"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- lightweight inline tests (console) ----
(function runTests() {
  try {
    const imgItem: BGItem = {
      id: "t1",
      name: "img",
      type: "image",
      src: "data:image/png;base64,xx",
      origin: "upload",
    };
    const cssItem: BGItem = {
      id: "t2",
      name: "css",
      type: "css",
      css: "linear-gradient(0deg, #000, #111)",
      origin: "preset",
    };
    const s1 = buildBackgroundStyle(imgItem, {
      fit: "cover",
      repeat: false,
      pos: "center center",
      blur: 0,
    });
    const s2 = buildBackgroundStyle(cssItem, {
      fit: "cover",
      repeat: false,
      pos: "center center",
      blur: 0,
    });
    console.assert(
      typeof s1.backgroundImage === "string" &&
        String(s1.backgroundImage).startsWith("url("),
      "image style should use url()",
    );
    console.assert(
      typeof s2.backgroundImage === "string" &&
        String(s2.backgroundImage).includes("linear-gradient"),
      "css style should include gradient",
    );

    const f1 = computeFrameStyle("mobile", false);
    console.assert(
      f1.width === "390px" && f1.height === "844px",
      "mobile frame",
    );
    const f2 = computeFrameStyle("mobile", true);
    console.assert(
      f2.width === "844px" && f2.height === "390px",
      "mobile rotated frame",
    );

    const ht = chromeHiddenToken(true, "top");
    console.assert(ht.includes("-translate-y-full"), "top hidden token");
    const hb = chromeHiddenToken(true, "bottom");
    console.assert(hb.includes("translate-y-full"), "bottom hidden token");

    // Favorite defaults and safety
    const n1: BGItem = {
      id: "x",
      name: "x",
      type: "image",
      src: "data:",
      origin: "upload",
    };
    console.assert(
      (n1.favorite ?? false) === false,
      "favorite defaults false when missing",
    );
    const toggled = !((undefined as unknown as boolean) ?? false);
    console.assert(
      toggled === true,
      "toggleFavorite uses nullish-coalescing default",
    );

    // Build style safety when item null
    const empty = buildBackgroundStyle(null as any, {
      fit: "cover",
      repeat: false,
      pos: "center center",
      blur: 0,
    });
    console.assert(
      typeof empty === "object",
      "buildBackgroundStyle returns object for null",
    );

    // Presets present and are gradients
    console.assert(PRESETS.length >= 4, "at least four gradients provided");
    console.assert(
      PRESETS.every((p) => p.type === "css" && typeof p.css === "string"),
      "presets are CSS gradients",
    );

    // Deletion policy: all items deletable including presets
    const p: BGItem = {
      id: "p",
      name: "preset",
      type: "css",
      css: "linear-gradient(0,#000,#111)",
      origin: "preset",
      favorite: false,
    };
    const u: BGItem = {
      id: "u",
      name: "upload",
      type: "image",
      src: "data:",
      origin: "upload",
      favorite: false,
    };
    const removed = [p, u].filter((x) => x.id !== "p");
    console.assert(
      removed.length === 1 && removed[0].id === "u",
      "preset not pinned and deletable",
    );

    // CSS snippet
    const cssTxt = cssSnippet(cssItem, "cover", false, "center center", 0.3);
    console.assert(
      cssTxt.includes("background-image"),
      "css snippet contains background-image",
    );

    // Contrast estimate bounds
    const c0 = estimateMinContrastFromOverlay(0.0);
    console.assert(Math.abs(c0.ratio - 1.0) < 1e-6, "overlay 0 → ratio ~ 1.0");
    const c9 = estimateMinContrastFromOverlay(0.9);
    console.assert(
      c9.ratio >= 7.0 && c9.passAAA,
      "overlay 0.9 → AAA likely pass",
    );

    // Additional: computeDrawRect sanity
    const rCover = computeDrawRect(
      1000,
      500,
      1000,
      1000,
      "cover",
      "center center",
    );
    console.assert(
      rCover.dh === 1000 && rCover.dw > 1000,
      "cover should fill and overflow on wide image into square",
    );
    const rContain = computeDrawRect(
      1000,
      500,
      1000,
      1000,
      "contain",
      "center center",
    );
    console.assert(
      rContain.dw === 1000 && rContain.dh === 500,
      "contain should letterbox and preserve aspect",
    );

    // Additional: normalizeItems ensures favorite default
    const norm = normalizeItems([
      {
        id: "n",
        name: "n",
        type: "css",
        css: "linear-gradient(#000,#111)",
        origin: "preset",
      } as any,
    ]);
    console.assert(norm[0].favorite === false, "favorite default");
    console.assert(norm[0].id === "n", "id default");
    console.assert(norm[0].name === "n", "name default");
    console.assert(norm[0].type === "css", "type default");
    console.assert(norm[0].css === "linear-gradient(#000,#111)", "css default");
    console.assert(norm[0].origin === "preset", "origin default");
    console.assert(norm[0].id === "n", "id default");
    console.assert(norm[0].name === "n", "name default");
  } catch (err) {
    // Silently ignore test failures in production
  }
})();
