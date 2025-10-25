import { useState, type FC, useRef, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { embeds, setEmbeds } from "../../state/embedsStore";
import { Embed } from "./embed/Embed";
import type { GridStack as GridStackType } from "gridstack";
import { DEFAULT_POSITION } from "./embed/position";
import EmbedHeader from "./EmbedHeader";

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStackType | null>(null);
  const [isGridReady, setIsGridReady] = useState(false);

  useEffect(() => {
    const initGrid = async () => {
      if (gridRef.current && !gridInstanceRef.current) {
        const { GridStack } = await import("gridstack");

        const grid = GridStack.init(
          {
            cellHeight: 70,
            float: true,
            margin: "24px 0 0 0",
            draggable: {
              handle: ".grid-stack-item-drag-handle",
            },
            resizable: {
              handles: "e, se, s, sw, w",
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
  }, [embedsStore, isGridReady]);

  return (
    <div ref={gridRef} className="grid-stack">
      {embedsStore.map((embed, idx) => (
        <div
          key={`embed-${idx}`}
          id={`embed-${idx}`}
          className="grid-stack-item"
        >
          <EmbedHeader {...embed} />
          <div className="grid-stack-item-content">
            <Embed {...embed} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmbedGrid;
