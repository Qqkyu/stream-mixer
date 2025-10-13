import type { FC } from "react";
import { useStore } from "@nanostores/react";
import { embeds } from "../../state/embedsStore";
import TwitchEmbed from "./twitch/TwitchEmbed";
import YoutubeEmbed from "./youtube/YoutubeEmbed";
import KickEmbed from "./kick/KickEmbed";
import { Responsive, WidthProvider } from "react-grid-layout";

const ResponsiveGridLayout = WidthProvider(Responsive);

const EmbedGrid: FC = () => {
  const embedsStore = useStore(embeds);

  return (
    <ResponsiveGridLayout
      className="layout"
      isDraggable
      isResizable
      breakpoints={{ lg: 1280, md: 992, sm: 767, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
    >
      {embedsStore.twitch.map((twitchEmbed, idx) => {
        return (
          <div key={`twitch-${idx}`} className="grid-item">
            <TwitchEmbed
              channel={twitchEmbed.channel}
              type={twitchEmbed.type}
            />
          </div>
        );
      })}
      {embedsStore.youtube.map((youtubeEmbed, idx) => {
        return (
          <div key={`youtube-${idx}`} className="grid-item">
            <YoutubeEmbed
              channel={youtubeEmbed.channel}
              type={youtubeEmbed.type}
            />
          </div>
        );
      })}
      {embedsStore.kick.map((kickEmbed, idx) => {
        return (
          <div key={`kick-${idx}`} className="grid-item">
            <KickEmbed channel={kickEmbed.channel} type={kickEmbed.type} />
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
};

export default EmbedGrid;
