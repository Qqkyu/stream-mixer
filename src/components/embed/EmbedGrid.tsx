import { useState, type FC, useRef, useEffect, useEffectEvent } from "react";
import { useStore } from "@nanostores/react";
import { embeds, setEmbeds } from "../../state/embedsStore";
import { Embed } from "./embed/Embed";
import type { GridStack as GridStackType } from "gridstack";
import { DEFAULT_POSITION } from "./embed/position";

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStackType | null>(null);
  const [showControlIcons, setShowControlIcons] = useState(false);
  const [isGridReady, setIsGridReady] = useState(false);

  useEffect(() => {
    const initGrid = async () => {
      if (gridRef.current && !gridInstanceRef.current) {
        const { GridStack } = await import("gridstack");

        const grid = GridStack.init(
          {
            cellHeight: 70,
            float: true,
            margin: "44px 0 0 0",
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
        gridInstanceRef.current = grid;

        grid.on("change", (_, nodes) => {
          if (!gridInstanceRef.current) return;

          setEmbeds(
            embeds.get().map((embed, idx) => {
              const node = nodes.find(({ el }) => el?.id === `embed-${idx}`);
              if (node) {
                return {
                  ...embed,
                  position: {
                    x: node.x ?? DEFAULT_POSITION.x,
                    y: node.y ?? DEFAULT_POSITION.y,
                    w: node.w ?? DEFAULT_POSITION.w,
                    h: node.h ?? DEFAULT_POSITION.h,
                  },
                };
              }
              return embed;
            }),
          );
        });

        setIsGridReady(true);

        return () => {
          grid.destroy();
          gridInstanceRef.current = null;
        };
      }
    };

    initGrid();
  }, []);

  useEffect(() => {
    if (!gridInstanceRef.current || !isGridReady) return;

    const grid = gridInstanceRef.current;

    grid.removeAll(false);

    embedsStore.forEach(({ position }, idx) => {
      const el = document.getElementById(`embed-${idx}`);
      if (el) {
        grid.makeWidget(el, {
          ...position,
          id: `embed-${idx}`,
        });
      }
    });

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
    setEmbeds(embeds.get().toSpliced(idx, 1));
  };

  return embedsStore.length > 0 ? (
    <div ref={gridRef} className="grid-stac bg-base-200 min-h-screen">
      {embedsStore.map((embed, idx) => (
        <div
          key={`embed-${idx}`}
          id={`embed-${idx}`}
          className="grid-stack-item mockup-browser indicator block overflow-visible border-base-300 border"
        >
          <div className="mockup-browser-toolbar before:!content-none !my-0 p-3 grid-stack-item-drag-handle cursor-move">
            <div className="flex pl-4 w-22 justify-evenly">
              <button
                className="w-3 h-3 rounded-full bg-red-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
                onClick={() => removeEmbed(idx)}
                onMouseOver={() => setShowControlIcons(true)}
                onMouseOut={() => setShowControlIcons(false)}
              >
                {showControlIcons && "✕"}
              </button>
              <button
                className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
                onMouseOver={() => setShowControlIcons(true)}
                onMouseOut={() => setShowControlIcons(false)}
              >
                {showControlIcons && "−"}
              </button>
              <button
                className="w-3 h-3 rounded-full bg-green-500 cursor-pointer no-drag flex items-center justify-center text-black text-[10px] font-bold leading-none"
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
          <div className="grid-stack-item-content border-t border-base-300">
            <Embed {...embed} />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="hero bg-base-200 min-h-screen">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">No Streams Yet</h1>
          <p className="py-6">
            Start mixing your favorite streams! Add Twitch, YouTube, or Kick
            streams to watch multiple channels at once in a customizable grid
            layout.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmbedGrid;
