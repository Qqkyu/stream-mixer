import { useState, type FC, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { embeds } from "../../state/embedsStore";
import { Responsive, WidthProvider, type Layout } from "react-grid-layout";
import { Embed } from "./embed/Embed";

const ResponsiveGridLayout = WidthProvider(Responsive);

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);
  // const [layouts, setLayouts] = useState<Array<Layout>>([
  //   ...embedsStore.map((embed, idx): Layout => {
  //     return {
  //       i: `embed-${idx}`,
  //       x: 0,
  //       y: 0,
  //       w: 0,
  //       h: 0,
  //     };
  //   }),
  // ]);

  useEffect(() => {
    console.log({ embedsStore: embedsStore });
  }, [embedsStore]);

  return (
    <ResponsiveGridLayout
      className="layout"
      isDraggable
      isResizable
      compactType="horizontal"
      breakpoints={{ lg: 1280, md: 992, sm: 767, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
    >
      {embedsStore.map((embed, idx) => {
        return (
          <div key={`embed-${idx}`} className="grid-item">
            <Embed {...embed} />
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
};

export default EmbedGrid;
