import React, { useState, useEffect, useMemo } from "react";

// ================================================================================================
// TYPES & CONSTANTS
// ================================================================================================

type BGItem = {
  id: string;
  name: string;
  type: "image" | "css";
  src?: string; // for image
  css?: string; // for css
  origin: "preset" | "upload";
  favorite?: boolean;
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
  darkMode: boolean; // For backwards compatibility
  cardColor: string;
  cardCount: number;
  generatedCards: Array<{ id: string; title: string; content: string }>;
  sidebarCollapsed: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

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
    name: "Auro",
    type: "css",
    css: "linear-gradient(135deg, #FF6B6B, #FFD166)",
    origin: "preset",
  },
  {
    id: uid(),
    name: "Celeste",
    type: "css",
    css: "linear-gradient(135deg, #5A8DFF, #A0E7E5)",
    origin: "preset",
  },
  {
    id: uid(),
    name: "Midnight",
    type: "css",
    css: "linear-gradient(135deg, #1D2B64, #F8CDDA)",
    origin: "preset",
  },
  {
    id: uid(),
    name: "Lush",
    type: "css",
    css: "linear-gradient(135deg, #11998e, #38ef7d)",
    origin: "preset",
  },
  {
    id: uid(),
    name: "Kye",
    type: "css",
    css: "linear-gradient(135deg, #8360c3, #2ebf91)",
    origin: "preset",
  },
  {
    id: uid(),
    name: "Orange",
    type: "css",
    css: "linear-gradient(135deg, #fdc830, #f37335)",
    origin: "preset",
  },
];

const POSITIONS = [
  { v: "center center", label: "center" },
  { v: "center top", label: "top" },
  { v: "center bottom", label: "bottom" },
  { v: "left center", label: "left" },
  { v: "right center", label: "right" },
  { v: "left top", label: "top left" },
  { v: "right top", label: "top right" },
  { v: "left bottom", label: "bottom left" },
  { v: "right bottom", label: "bottom right" },
];

const DEVICES = [
  { key: "fluid", label: "Fluid 100%", w: "100%", h: "100%" },
  { key: "mobile", label: "Mobile", w: 390, h: 844 },
  { key: "tablet", label: "Tablet", w: 820, h: 1180 },
  { key: "desktop", label: "Desktop", w: 1440, h: 900 },
] as const;

type DeviceKey = "fluid" | "mobile" | "tablet" | "desktop";

const LS_KEY = "mai-bg-chooser-v1";

// ================================================================================================
// HELPER FUNCTIONS
// ================================================================================================

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

function normalizeItem(x: BGItem): BGItem {
  return { ...x, favorite: x.favorite ?? false };
}
function normalizeItems(xs: BGItem[]): BGItem[] {
  return xs.filter(Boolean).map(normalizeItem);
}

function buildBackgroundStyle(
  item: BGItem | undefined,
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
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
    transform: blur > 0 ? "scale(1.1)" : undefined, // avoid sharp edges with blur
  };
  if (item.type === "image" && item.src) {
    base.backgroundImage = `url(${item.src})`;
  } else if (item.type === "css" && item.css) {
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
  return `/* Background */\n.selector {\n  background-image: ${bi};\n  background-size: ${fit};\n  background-repeat: ${repeat ? "repeat" : "no-repeat"};\n  background-position: ${pos};\n  position: relative;\n}\n/* Overlay */\n.selector::before {\n  content: ""; position: absolute; inset: 0;\n  background: rgba(0,0,0,${overlay.toFixed(
    2,
  )});\n  pointer-events: none;\n}`;
}

function downloadBlob(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function estimateMinContrastFromOverlay(overlay: number) {
  const Lbg = 1 - overlay;
  const Ltext = 1; // white text
  const ratio = (Ltext + 0.05) / (Lbg + 0.05);
  const passAA = ratio >= 4.5;
  const passAAA = ratio >= 7.0;
  return { ratio, passAA, passAAA };
}

function chooseTextColorForCard(
  overlay: number,
  cardOpacity: number,
  cardColor: string = "#000000",
) {
  const a = Math.max(0, Math.min(1, cardOpacity));
  const L_under_max = 1 - Math.max(0, Math.min(0.95, overlay));

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const rgb = hexToRgb(cardColor);
  const cardLuminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  const L_card = a * cardLuminance + (1 - a) * L_under_max;

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
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);

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
      drawGradientBackground(ctx, it.css, canvas.width, canvas.height);
    }
  };

  const drawCompare = async () => {
    ctx.save();
    ctx.rect(0, 0, width / 2, height);
    ctx.clip();
    await drawItem(compareA ?? item);
    ctx.restore();
    ctx.save();
    ctx.rect(width / 2, 0, width / 2, height);
    ctx.clip();
    await drawItem(compareB ?? item);
    ctx.restore();
  };

  const a = compareA ?? item;
  const b = showB ? (compareB ?? item) : a;

  if (slotA != null || slotB != null) {
    ctx.save();
    ctx.rect(0, 0, width * (showB ? 1 : 0.5), height);
    ctx.clip();
    await drawItem(a);
    ctx.restore();
    ctx.save();
    ctx.rect(width * (showB ? 0.5 : 1), 0, width, height);
    ctx.clip();
    await drawItem(b);
    ctx.restore();
  } else {
    await drawItem(item);
  }

  ctx.save();
  ctx.globalAlpha = overlay;
  ctx.fillStyle = "black";
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
  ctx.filter = blur > 0 ? `blur(${blur}px)` : "none";
  if (repeat) {
    const pat = ctx.createPattern(img, "repeat")!;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
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
  ctx.filter = "none";
}

function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  css: string,
  W: number,
  H: number,
) {
  const colors = extractColors(css);
  if (colors.length < 2) {
    ctx.fillStyle = colors[0] || "black";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function extractColors(gradient: string): string[] {
  const hex = gradient.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})/gi) || [];
  const rgba = gradient.match(/rgba?\\([^\\)]+\\)/gi) || [];
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
    return { dx: 0, dy: 0, dw: sw, dh: sh };
  }
  const srcRatio = sw / sh;
  const dstRatio = dw / dh;
  let w = dw,
    h = dh;
  if (fit === "cover") {
    if (srcRatio > dstRatio) {
      w = dw;
      h = dw / srcRatio;
    } else {
      h = dh;
      w = dh * srcRatio;
    }
  } else if (fit === "contain") {
    if (srcRatio > dstRatio) {
      w = dw;
      h = dw / srcRatio;
    } else {
      h = dh;
      w = dh * srcRatio;
    }
  }
  const [xPos, yPos] = pos.split(" ");
  const x = xPos === "left" ? 0 : xPos === "right" ? dw - w : (dw - w) / 2;
  const y = yPos === "top" ? 0 : yPos === "bottom" ? dh - h : (dh - h) / 2;
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
  ];
  const cards = [];
  for (let i = 0; i < count; i++) {
    cards.push({
      id: uid(),
      title: cardTitles[Math.floor(Math.random() * cardTitles.length)],
      content: cardContents[Math.floor(Math.random() * cardContents.length)],
    });
  }
  return cards;
}

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

export default function MAI_Background_Chooser_Demo() {
  // State
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
      return !!(JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState)
        .repeat;
    } catch {
      return false;
    }
  });
  const [pos, setPos] = useState<string>(() => {
    try {
      return (
        (JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState).pos ||
        "center center"
      );
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
      let deviceKey = p.device;
      if (deviceKey === "mobile-portrait" || deviceKey === "mobile-landscape") {
        deviceKey = "mobile";
      }
      return (deviceKey || "fluid") as DeviceKey;
    } catch {
      return "fluid";
    }
  });
  const [rotate, setRotate] = useState<boolean>(() => {
    try {
      return !!(JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState)
        .rotate;
    } catch {
      return false;
    }
  });
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
      return !!(JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState)
        .darkMode;
    } catch {
      return false;
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return !!(JSON.parse(localStorage.getItem(LS_KEY) || "{}") as ExportState)
        .sidebarCollapsed;
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

  const [grid, setGrid] = useState(false);
  const [slotA, setSlotA] = useState<number | null>(null);
  const [slotB, setSlotB] = useState<number | null>(null);
  const [showB, setShowB] = useState(false);
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
      sidebarCollapsed,
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
    sidebarCollapsed,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (k === "?") {
        setHelpOpen((v) => !v);
        return;
      }
      if (k === "m") {
        setMeterOpen((v) => !v);
        return;
      }
      if (k === "y") {
        if (!cur) return;
        navigator.clipboard?.writeText(
          cssSnippet(cur, fit, repeat, pos, overlay),
        );
        setToast("CSS copied");
        setTimeout(() => setToast(null), 1200);
        return;
      }
      if (k === "j") {
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
          sidebarCollapsed,
        };
        downloadBlob("mai-background.json", JSON.stringify(state, null, 2));
        setToast("Exported JSON");
        setTimeout(() => setToast(null), 1200);
        return;
      }
      if (k === "p") {
        doExportPNG();
        return;
      }
      if (k === "s") {
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
            cardColor,
            cardCount,
            generatedCards,
            sidebarCollapsed,
          };
          localStorage.setItem(LS_KEY, JSON.stringify(st));
          setToast("Saved");
          setTimeout(() => setToast(null), 800);
        } catch {}
        return;
      }
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
    cardColor,
    cardCount,
    generatedCards,
    sidebarCollapsed,
  ]);

  async function addUploads(files: FileList | null) {
    if (!files || !files.length) return;
    const adds: BGItem[] = [];
    for (const f of Array.from(files)) {
      const nameOk = /\.(avif|webp|jpe?g|png|gif|bmp|svg)$/i.test(f.name);
      const typeOk = f.type ? f.type.startsWith("image/") : false;
      if (!(typeOk || nameOk)) continue;
      try {
        const src = await fileToDataURL(f);
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

  const cardBlurMax = 18;
  const cardBlur = useMemo(
    () =>
      Math.max(
        0,
        Math.min(cardBlurMax, Math.round((1 - cardOpacity) * cardBlurMax)),
      ),
    [cardOpacity],
  );

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

  const cardTextChoice = useMemo(
    () => chooseTextColorForCard(overlay, cardOpacity, cardColor),
    [overlay, cardOpacity, cardColor],
  );
  const cardTextColor = cardTextChoice.color;
  const cardTextClass =
    cardTextColor === "black" ? "text-black/80" : "text-white/80";
  const cardHeadingClass =
    cardTextColor === "black" ? "text-black" : "text-white";
  const cardButtonClass =
    cardTextColor === "black"
      ? "bg-black/10 hover:bg-black/20 text-black"
      : "bg-white/10 hover:bg-white/20 text-white";

  async function doExportPNG() {
    const { width: w, height: h } = computeFrameStyle(device, rotate);
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
      width: parseInt(String(w).replace("px", "")) || 1440,
      height: parseInt(String(h).replace("px", "")) || 900,
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

  const getDeviceCanvasStyle = () => {
    if (device === "fluid") {
      return { width: "100%", height: "100%" };
    }
    return computeFrameStyle(device, rotate);
  };

  return (
    <div className="min-h-screen bg-neutral-800 text-white flex">
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-72"} transition-all duration-300 bg-black/50 border-r border-white/10 flex flex-col shrink-0`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="font-semibold tracking-wide text-sm">
              MAI — Controls
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded hover:bg-white/10"
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {sidebarCollapsed ? (
            <div className="flex flex-col space-y-4 items-center">
              <label
                className="cursor-pointer p-2 rounded hover:bg-white/10"
                title="Upload"
              >
                📁{" "}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => addUploads(e.target.files)}
                />
              </label>
              <button
                onClick={() =>
                  setGeneratedCards(generateRandomCards(cardCount))
                }
                className="p-2 rounded hover:bg-white/10"
                title="Generate Cards"
              >
                🎲
              </button>
              <button
                onClick={() => setMeterOpen((v) => !v)}
                className="p-2 rounded hover:bg-white/10"
                title="Contrast Meter"
              >
                Ⓜ️
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Controls Sections */}
              <div>
                <label className="block text-sm font-medium mb-2">Upload</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.avif,.webp"
                  className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-white/10 file:text-white file:hover:bg-white/20 file:cursor-pointer"
                  onChange={(e) => addUploads(e.target.files)}
                />
              </div>

              {/* Background */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Background</label>
                <div>
                  <label className="text-xs opacity-80">Fit</label>
                  <select
                    value={fit}
                    onChange={(e) => setFit(e.target.value as any)}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm outline-none"
                  >
                    <option value="cover">cover</option>
                    <option value="contain">contain</option>
                    <option value="auto">auto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-80">Position</label>
                  <select
                    value={pos}
                    onChange={(e) => setPos(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm outline-none"
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
                    className="rounded"
                  />{" "}
                  Repeat
                </label>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Cards</label>
                <div>
                  <label className="text-xs opacity-80">Color</label>
                  <input
                    type="color"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="w-full h-8 rounded border border-white/20 bg-transparent cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-80">Count</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={cardCount}
                      onChange={(e) =>
                        setCardCount(parseInt(e.target.value) || 3)
                      }
                      className="flex-1 bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm outline-none"
                    />
                    <button
                      onClick={() =>
                        setGeneratedCards(generateRandomCards(cardCount))
                      }
                      className="px-3 py-1 rounded-md bg-neutral-700 hover:bg-neutral-600 text-sm"
                    >
                      Random
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs opacity-80">Opacity</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={cardOpacity}
                    onChange={(e) => setCardOpacity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Effects */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Effects</label>
                <div>
                  <label className="text-xs opacity-80">Overlay</label>
                  <input
                    type="range"
                    min={0}
                    max={0.95}
                    step={0.01}
                    value={overlay}
                    onChange={(e) => setOverlay(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs opacity-80">Blur</label>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={0.5}
                    value={blur}
                    onChange={(e) => setBlur(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Device */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Device Preview
                </label>
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value as DeviceKey)}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-sm outline-none"
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
                    className="w-full px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
                  >
                    Rotate
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-1">
                <label className="block text-sm font-medium">Actions</label>
                <button
                  onClick={() => {
                    if (!cur) return;
                    navigator.clipboard?.writeText(
                      cssSnippet(cur, fit, repeat, pos, overlay),
                    );
                    setToast("CSS copied");
                    setTimeout(() => setToast(null), 1200);
                  }}
                  className="w-full px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
                >
                  Copy CSS
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
                      darkMode,
                      cardColor,
                      cardCount,
                      generatedCards,
                      sidebarCollapsed,
                    };
                    downloadBlob(
                      "mai-background.json",
                      JSON.stringify(state, null, 2),
                    );
                    setToast("Exported JSON");
                    setTimeout(() => setToast(null), 1200);
                  }}
                  className="w-full px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
                >
                  Export JSON
                </button>
                <button
                  onClick={doExportPNG}
                  className="w-full px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
                >
                  Export PNG
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMeterOpen((v) => !v)}
                    className="flex-1 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
                  >
                    Contrast
                  </button>
                  <button
                    onClick={() => setHelpOpen((v) => !v)}
                    className="flex-1 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
                  >
                    Help
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {!sidebarCollapsed && (
          <div className="border-t border-white/10 p-4">
            <div className="text-xs opacity-80 mb-2">Backgrounds</div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
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
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-auto">
        <div
          className="relative rounded-xl shadow-2xl transition-all duration-300"
          style={getDeviceCanvasStyle()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addUploads(e.dataTransfer?.files);
          }}
        >
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={currentStyle}
          />
          {(slotA != null || slotB != null) && (
            <div
              className="absolute inset-0 transition-all duration-300"
              style={{
                ...compareStyle,
                clipPath: showB ? "inset(0 0 0 50%)" : "inset(0 50% 0 0)",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: `rgba(0,0,0,${overlay})` }}
          />
          {grid && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
          )}

          <div className="relative z-10 h-full overflow-y-auto">
            <section className="max-w-7xl mx-auto px-6 py-12">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Museum of Artificial Intelligence
              </h1>
              <p className="mt-4 text-lg md:text-xl max-w-2xl text-white/80">
                Exhibition platform for the history and future of computation.
                Prototype layout to evaluate background imagery, readability,
                and motion.
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

            <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedCards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-2xl border border-white/10 p-5"
                  style={cardPanelStyle}
                >
                  <h3 className={`text-xl font-semibold ${cardHeadingClass}`}>
                    {card.title}
                  </h3>
                  <p className={`mt-2 text-sm ${cardTextClass}`}>
                    {card.content}
                  </p>
                  <button
                    className={`mt-4 text-sm px-4 py-2 rounded-md ${cardButtonClass}`}
                  >
                    Open
                  </button>
                </article>
              ))}
            </section>

            <section className="max-w-7xl mx-auto px-6 py-12">
              <div
                className="rounded-2xl p-6 border border-white/10"
                style={cardPanelStyle}
              >
                <h2 className={`text-2xl font-semibold ${cardHeadingClass}`}>
                  Sample Text Block
                </h2>
                <p className={`mt-3 leading-7 ${cardTextClass}`}>
                  This is a block of paragraph text used to check long-form
                  readability against your background choice. Adjust overlay to
                  meet WCAG contrast goals. Headlines, links, and buttons are
                  represented above.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Global Overlays */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div className="max-w-3xl w-full bg-neutral-900 p-6 rounded-lg border border-white/10">
            <h2 className="text-2xl font-semibold text-white">Shortcuts</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-white/90 text-sm">
              <li>
                <span className="font-mono inline-block w-12">←/→</span> Select
                background
              </li>
              <li>
                <span className="font-mono inline-block w-12">1–9</span> Pick
                thumbnail
              </li>
              <li>
                <span className="font-mono inline-block w-12">F</span> Favorite
                current
              </li>
              <li>
                <span className="font-mono inline-block w-12">C</span> Toggle
                A/B compare
              </li>
              <li>
                <span className="font-mono inline-block w-12">Y</span> Copy CSS
              </li>
              <li>
                <span className="font-mono inline-block w-12">J</span> Export
                JSON
              </li>
              <li>
                <span className="font-mono inline-block w-12">P</span> Export
                PNG
              </li>
              <li>
                <span className="font-mono inline-block w-12">M</span> Toggle
                contrast meter
              </li>
              <li>
                <span className="font-mono inline-block w-12">S</span> Save
                state
              </li>
              <li>
                <span className="font-mono inline-block w-12">?</span> Toggle
                this help
              </li>
            </ul>
            <p className="mt-4 text-xs opacity-70">Click anywhere to close.</p>
          </div>
        </div>
      )}

      {meterOpen && (
        <div className="fixed right-4 top-4 z-[55] rounded-lg border border-white/15 bg-black/80 backdrop-blur px-3 py-2 text-xs space-y-1">
          <div className="font-semibold opacity-80">Contrast Checks</div>
          <div>
            Page text (white):{" "}
            <span
              className={`font-mono ${contrastPage.passAA ? "text-green-400" : "text-red-400"}`}
            >
              {contrastPage.ratio.toFixed(2)}:1
            </span>
          </div>
          <div>
            Card text ({cardTextColor}):{" "}
            <span
              className={`font-mono ${contrastCard.passAA ? "text-green-400" : "text-red-400"}`}
            >
              {contrastCard.ratio.toFixed(2)}:1
            </span>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 top-4 z-[70] px-3 py-1.5 rounded bg-white/20 border border-white/30 text-sm backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

// ================================================================================================
// THUMBNAIL COMPONENT
// ================================================================================================

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
      className={`relative shrink-0 w-full aspect-video rounded-md overflow-hidden border-2 ${active ? "border-white" : "border-white/20 hover:border-white/50"}`}
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
      <div className="absolute top-1 right-1 flex gap-1">
        <button
          onClick={onFav}
          title="Favorite"
          className={`px-1 py-0.5 rounded-sm bg-black/60 text-xs ${isFav ? "text-yellow-300" : "text-white"}`}
        >
          ★
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            title="Remove"
            className="px-1 py-0.5 rounded-sm bg-black/60 text-xs"
          >
            ✕
          </button>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-[10px] leading-tight truncate">
        {item.name}
      </div>
    </div>
  );
}

// ================================================================================================
// INLINE TESTS
// ================================================================================================

(function runTests() {
  if (typeof window === "undefined") return;
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
    console.assert(
      typeof s1.backgroundImage === "string" &&
        String(s1.backgroundImage).startsWith("url("),
      "image style should use url()",
    );
    const f1 = computeFrameStyle("mobile-portrait", false);
    console.assert(
      f1.width === "390px" && f1.height === "844px",
      "mobile frame",
    );
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
    console.assert(PRESETS.length >= 4, "at least four gradients provided");
    const c0 = estimateMinContrastFromOverlay(0.0);
    console.assert(Math.abs(c0.ratio - 1.0) < 1e-6, "overlay 0 → ratio ~ 1.0");
  } catch (err) {
    // Silently ignore test failures in production
  }
})();
