import { useState, type FC, useRef, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { embeds, setEmbeds } from "../../state/embedsStore";
import { fullscreenEmbed } from "../../state/layoutStore";
import { Embed } from "./embed/Embed";
import type { GridStack as GridStackType, GridStackWidget } from "gridstack";
import { DEFAULT_POSITION } from "./embed/position";
import HelpModalButton from "../helpModal/HelpModalButton";
import { compactMode, setCompactMode } from "../../state/preferencesStore";
import type { Embed as EmbedType } from "./EmbedTypes";

const GRID_ROW_HEIGHT = 48;

function getViewportRowCount(pageHeaderHeight: number): number {
  return Math.max(
    1,
    Math.ceil((window.innerHeight - pageHeaderHeight) / GRID_ROW_HEIGHT),
  );
}

function getEmbedLabel(embed: EmbedType): string {
  if (embed.platform === "youtube") {
    return `youtube.com/watch?v=${embed.channel}`;
  }

  if (embed.platform === "kick") {
    return `kick.com/${embed.channel}`;
  }

  return `${embed.platform}.tv/${embed.channel}`;
}

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);
  const fullscreenEmbedStore = useStore(fullscreenEmbed);
  const compactModeStore = useStore(compactMode);
  const pageHeaderHeight = compactModeStore ? 0 : 64;
  const workspaceMinHeightClass = compactModeStore
    ? "min-h-dvh"
    : "min-h-[calc(100dvh-64px)]";

  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStackType | null>(null);
  const registeredEmbedIdsRef = useRef(new Set<string>());
  const restoringEmbedIdsRef = useRef(new Set<string>());
  const compactModeExitTimerRef = useRef<number>();

  const [showControlIcons, setShowControlIcons] = useState(false);
  const [isGridReady, setIsGridReady] = useState(false);
  const [showMinimizedShelf, setShowMinimizedShelf] = useState(false);
  const [showCompactModeExit, setShowCompactModeExit] = useState(false);

  const revealCompactModeExit = () => {
    window.clearTimeout(compactModeExitTimerRef.current);
    setShowCompactModeExit(true);
    compactModeExitTimerRef.current = window.setTimeout(
      () => setShowCompactModeExit(false),
      1500,
    );
  };

  useEffect(() => {
    if (!compactModeStore) {
      window.clearTimeout(compactModeExitTimerRef.current);
      setShowCompactModeExit(false);
    }

    return () => window.clearTimeout(compactModeExitTimerRef.current);
  }, [compactModeStore]);

  useEffect(() => {
    const hasMinimizedEmbeds = embedsStore.some(({ minimized }) => minimized);
    if (!hasMinimizedEmbeds) {
      setShowMinimizedShelf(false);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const pointerIsOverShelf =
        event.target instanceof Element &&
        event.target.closest("[data-minimized-shelf]") != null;

      setShowMinimizedShelf(
        pointerIsOverShelf || event.clientY >= window.innerHeight - 64,
      );
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [embedsStore]);

  useEffect(() => {
    if (fullscreenEmbedStore != null) return;

    let cancelled = false;
    let initializedGrid: GridStackType | null = null;

    async function initGrid() {
      if (gridRef.current && !gridInstanceRef.current) {
        const { GridStack } = await import("gridstack");
        if (cancelled || !gridRef.current) return;

        const grid = GridStack.init(
          {
            cellHeight: GRID_ROW_HEIGHT,
            float: false,
            minRow: getViewportRowCount(pageHeaderHeight),
            margin: compactModeStore ? 0 : "44px 0 0 0",
            draggable: {
              handle: ".grid-stack-item-drag-handle",
              cancel: ".no-drag",
            },
            resizable: {
              handles: "se, sw",
            },
          },
          gridRef.current,
        );
        initializedGrid = grid;
        gridInstanceRef.current = grid;
        registeredEmbedIdsRef.current = new Set(
          embeds
            .get()
            .filter(({ minimized }) => !minimized)
            .map(({ id }) => id),
        );

        const persistLayout = () => {
          const savedLayout = grid.save(false) as GridStackWidget[];
          const positionsById = new Map(
            savedLayout.flatMap((node) => {
              if (!node.id) return [];

              return [
                [
                  node.id,
                  {
                    x: node.x ?? DEFAULT_POSITION.x,
                    y: node.y ?? DEFAULT_POSITION.y,
                    w: node.w ?? DEFAULT_POSITION.w,
                    h: node.h ?? DEFAULT_POSITION.h,
                  },
                ] as const,
              ];
            }),
          );

          setEmbeds(
            embeds.get().map((embed) => {
              const position = positionsById.get(`embed-${embed.id}`);
              return position ? { ...embed, position } : embed;
            }),
          );
        };

        const startInteraction = () => {
          gridRef.current?.classList.add("grid-stack-interacting");
        };
        const stopInteraction = () => {
          gridRef.current?.classList.remove("grid-stack-interacting");
          persistLayout();
        };

        grid.on("added", persistLayout);
        grid.on("dragstart resizestart", startInteraction);
        grid.on("dragstop resizestop", stopInteraction);

        setIsGridReady(true);
      }
    }

    void initGrid();

    return () => {
      cancelled = true;
      initializedGrid?.destroy(false);
      gridRef.current?.classList.remove("grid-stack-interacting");
      if (gridInstanceRef.current === initializedGrid) {
        gridInstanceRef.current = null;
      }
      registeredEmbedIdsRef.current.clear();
      setIsGridReady(false);
    };
  }, [fullscreenEmbedStore]);

  useEffect(() => {
    gridInstanceRef.current?.margin(compactModeStore ? 0 : "44px 0 0 0");
  }, [compactModeStore]);

  useEffect(() => {
    function updateGridHeight() {
      if (gridInstanceRef.current && gridRef.current) {
        gridInstanceRef.current.updateOptions({
          minRow: getViewportRowCount(pageHeaderHeight),
        });
      }
    }

    updateGridHeight();
    window.addEventListener("resize", updateGridHeight);
    return () => {
      window.removeEventListener("resize", updateGridHeight);
    };
  }, [pageHeaderHeight]);

  useEffect(() => {
    if (!gridInstanceRef.current || !isGridReady) return;

    const grid = gridInstanceRef.current;
    const visibleEmbeds = embedsStore.filter(({ minimized }) => !minimized);
    const currentEmbedIds = new Set(visibleEmbeds.map(({ id }) => id));

    visibleEmbeds.forEach(({ id, position }) => {
      if (registeredEmbedIdsRef.current.has(id)) return;

      const el = document.getElementById(`embed-${id}`);
      if (el) {
        grid.makeWidget(el, {
          ...position,
          id: `embed-${id}`,
          autoPosition: !restoringEmbedIdsRef.current.has(id),
        });
        restoringEmbedIdsRef.current.delete(id);
      }
    });

    registeredEmbedIdsRef.current = currentEmbedIds;

    const seResizeHandle =
      gridRef.current?.querySelectorAll(".ui-resizable-se");
    const swResizeHandle =
      gridRef.current?.querySelectorAll(".ui-resizable-sw");

    seResizeHandle?.forEach((handle) => {
      handle.innerHTML = "↘︎";
      handle.classList.add("indicator-item");
    });
    swResizeHandle?.forEach((handle) => {
      handle.innerHTML = "↙︎";
      handle.classList.add("indicator-item");
    });
  }, [embedsStore, isGridReady]);

  const removeEmbed = (idx: number) => {
    const embed = embeds.get()[idx];
    const element = embed ? document.getElementById(`embed-${embed.id}`) : null;
    if (element) gridInstanceRef.current?.removeWidget(element, false);
    setEmbeds(embeds.get().toSpliced(idx, 1));
  };

  const minimizeEmbed = (idx: number) => {
    const embed = embeds.get()[idx];
    if (!embed) return;

    const element = document.getElementById(`embed-${embed.id}`);
    const savedNode = (
      gridInstanceRef.current?.save(false) as GridStackWidget[] | undefined
    )?.find(({ id }) => id === `embed-${embed.id}`);
    const position = savedNode
      ? {
          x: savedNode.x ?? embed.position.x,
          y: savedNode.y ?? embed.position.y,
          w: savedNode.w ?? embed.position.w,
          h: savedNode.h ?? embed.position.h,
        }
      : embed.position;

    if (element) gridInstanceRef.current?.removeWidget(element, false);
    registeredEmbedIdsRef.current.delete(embed.id);
    setEmbeds(
      embeds
        .get()
        .map((currentEmbed, currentIdx) =>
          currentIdx === idx
            ? { ...currentEmbed, position, minimized: true }
            : currentEmbed,
        ),
    );
  };

  const restoreEmbed = (id: string) => {
    restoringEmbedIdsRef.current.add(id);
    setEmbeds(
      embeds
        .get()
        .map((embed) =>
          embed.id === id ? { ...embed, minimized: false } : embed,
        ),
    );
  };

  if (fullscreenEmbedStore != null) {
    const embed = embedsStore[fullscreenEmbedStore];
    return (
      <div key={embed.id} className="bg-base-200 h-full w-screen">
        <div className="mockup-browser indicator flex flex-col overflow-hidden border-base-300 border w-full h-full">
          <div className="mockup-browser-toolbar before:!content-none !my-0 p-3 flex-shrink-0">
            <div className="flex pl-4 w-22 justify-evenly">
              <button
                className="w-3 h-3 rounded-full bg-red-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
                onClick={() => {
                  fullscreenEmbed.set(undefined);
                  setShowControlIcons(false);
                }}
                onMouseOver={() => setShowControlIcons(true)}
                onMouseOut={() => setShowControlIcons(false)}
              >
                {showControlIcons && "✕"}
              </button>
              <button
                className="w-3 h-3 rounded-full bg-gray-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
                disabled
              />
              <button
                className="w-3 h-3 rounded-full bg-green-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
                onClick={() => {
                  setShowControlIcons(false);
                  fullscreenEmbed.set(undefined);
                }}
                onMouseOver={() => setShowControlIcons(true)}
                onMouseOut={() => setShowControlIcons(false)}
              >
                {showControlIcons && "⤢"}
              </button>
            </div>
            <div className="input no-drag">
              {embed.platform === "twitch" && `twitch.tv/${embed.channel}`}
              {embed.platform === "youtube" &&
                `youtube.com/watch?v=${embed.channel}`}
              {embed.platform === "kick" && `kick.com/${embed.channel}`}
            </div>
          </div>
          <div className="flex-1 border-t border-base-300 min-h-0">
            <Embed {...embed} />
          </div>
        </div>
      </div>
    );
  }

  const minimizedEmbeds = embedsStore.filter(({ minimized }) => minimized);

  return (
    <>
      <div
        ref={gridRef}
        className={`grid-stack stream-embed-grid bg-base-200 ${workspaceMinHeightClass}`}
      >
        {embedsStore.length == 0 && (
          <div className={`hero bg-base-200 ${workspaceMinHeightClass}`}>
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-5xl font-bold">
                  Watch multiple live streams at once
                </h1>
                <p className="py-6">
                  Build a customizable multistream viewer with Twitch, YouTube,
                  and Kick video and chats in one browser window.
                </p>
                <HelpModalButton type="big" />
                <nav
                  className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm"
                  aria-label="Learn about Stream Mix"
                >
                  <a
                    className="link link-hover"
                    href="/guides/watch-multiple-streams"
                  >
                    Setup guide
                  </a>
                  <a className="link link-hover" href="/faq">
                    FAQ
                  </a>
                  <a className="link link-hover" href="/about">
                    About
                  </a>
                  <a className="link link-hover" href="/privacy">
                    Privacy
                  </a>
                </nav>
              </div>
            </div>
          </div>
        )}
        {embedsStore.map((embed, idx) =>
          embed.minimized ? null : (
            <div
              key={embed.id}
              id={`embed-${embed.id}`}
              className="grid-stack-item mockup-browser indicator block overflow-visible border-base-300 border"
              gs-id={`embed-${embed.id}`}
              gs-x={embed.position.x}
              gs-y={embed.position.y}
              gs-w={embed.position.w}
              gs-h={embed.position.h}
            >
              {compactModeStore && (
                <div className="compact-embed-header-trigger" />
              )}
              <div
                className={`mockup-browser-toolbar before:!content-none !my-0 p-3 grid-stack-item-drag-handle cursor-move ${compactModeStore ? "compact-embed-header" : ""}`}
              >
                <div className="flex pl-4 w-22 justify-evenly">
                  <button
                    className="w-3 h-3 rounded-full bg-red-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
                    onClick={() => {
                      setShowControlIcons(false);
                      removeEmbed(idx);
                    }}
                    onMouseOver={() => setShowControlIcons(true)}
                    onMouseOut={() => setShowControlIcons(false)}
                  >
                    {showControlIcons && "✕"}
                  </button>
                  <button
                    className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
                    onClick={() => {
                      setShowControlIcons(false);
                      minimizeEmbed(idx);
                    }}
                    onMouseOver={() => setShowControlIcons(true)}
                    onMouseOut={() => setShowControlIcons(false)}
                  >
                    {showControlIcons && "−"}
                  </button>
                  <button
                    className="w-3 h-3 rounded-full bg-green-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
                    onClick={() => {
                      setShowControlIcons(false);
                      fullscreenEmbed.set(idx);
                    }}
                    onMouseOver={() => setShowControlIcons(true)}
                    onMouseOut={() => setShowControlIcons(false)}
                  >
                    {showControlIcons && "⤢"}
                  </button>
                </div>
                <div className="input no-drag">
                  {embed.platform === "twitch" && `twitch.tv/${embed.channel}`}
                  {embed.platform === "youtube" &&
                    `youtube.com/watch?v=${embed.channel}`}
                  {embed.platform === "kick" && `kick.com/${embed.channel}`}
                </div>
              </div>
              <div
                className={`grid-stack-item-content ${compactModeStore ? "" : "border-t border-base-300"}`}
              >
                <Embed {...embed} />
              </div>
            </div>
          ),
        )}
      </div>
      {compactModeStore && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-x-0 top-0 z-[2199] h-12"
            onPointerEnter={revealCompactModeExit}
            onPointerMove={revealCompactModeExit}
            onPointerLeave={() => setShowCompactModeExit(false)}
          />
          <div className="pointer-events-none fixed top-0 left-1/2 z-[2300] -translate-x-1/2">
            <button
              className={`btn btn-primary btn-sm btn-circle text-lg font-bold shadow-md transition-[opacity,transform] duration-200 ease-out active:!translate-y-2 active:!scale-100 ${showCompactModeExit ? "pointer-events-auto translate-y-2 scale-100 opacity-100" : "pointer-events-none -translate-y-[calc(100%+0.75rem)] scale-90 opacity-0"}`}
              onClick={() => setCompactMode(false)}
              onFocus={revealCompactModeExit}
              onBlur={() => setShowCompactModeExit(false)}
              onPointerEnter={revealCompactModeExit}
              onPointerMove={revealCompactModeExit}
              onPointerLeave={() => setShowCompactModeExit(false)}
              aria-label="Exit compact mode"
              title="Exit compact mode"
            >
              ↓
            </button>
          </div>
        </>
      )}
      {minimizedEmbeds.length > 0 && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-x-0 bottom-0 z-[1999] h-6"
            onPointerEnter={() => setShowMinimizedShelf(true)}
          />
          <aside
            aria-label="Minimized streams"
            data-minimized-shelf
            className={`fixed inset-x-0 bottom-3 z-[2000] flex justify-center px-3 pointer-events-none transition-all duration-150 ${
              showMinimizedShelf
                ? "translate-y-0 opacity-100"
                : "translate-y-[calc(100%+1rem)] opacity-0"
            }`}
            onFocusCapture={() => setShowMinimizedShelf(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setShowMinimizedShelf(false);
              }
            }}
          >
            <div className="flex max-w-full gap-2 overflow-x-auto rounded-box border border-base-content/20 bg-base-100/95 p-2 shadow-xl backdrop-blur pointer-events-auto">
              {minimizedEmbeds.map((embed) => (
                <button
                  key={embed.id}
                  className="btn btn-sm max-w-64 flex-nowrap justify-start"
                  title={`Restore ${getEmbedLabel(embed)}`}
                  onClick={() => restoreEmbed(embed.id)}
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      embed.platform === "twitch"
                        ? "bg-twitch"
                        : embed.platform === "youtube"
                          ? "bg-youtube"
                          : "bg-kick"
                    }`}
                  />
                  <span className="truncate">{getEmbedLabel(embed)}</span>
                </button>
              ))}
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default EmbedGrid;
