import { useState, type FC, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { embeds } from "../../state/embedsStore";
import {
  Responsive,
  WidthProvider,
  type Layout,
  type Layouts,
} from "react-grid-layout";
import { Embed } from "./embed/Embed";

const ResponsiveGridLayout = WidthProvider(Responsive);

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);
  const [layouts, setLayouts] = useState<Layouts>(() => {
    if (typeof localStorage === "undefined") {
      return {};
    }

    const localStorageLayouts = localStorage.getItem("embeds-layouts");
    if (localStorageLayouts == null) {
      return {};
    }

    try {
      return JSON.parse(localStorageLayouts);
    } catch (e) {
      return {};
    }
  });

  const onLayoutChange = (_: Array<Layout>, layouts: Layouts) => {
    setLayouts({ ...layouts });
    localStorage.setItem("embeds-layouts", JSON.stringify(layouts));
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      onLayoutChange={onLayoutChange}
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
