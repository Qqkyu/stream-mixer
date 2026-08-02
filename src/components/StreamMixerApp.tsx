import type { FC } from "react";
import EmbedGrid from "./embedGrid/EmbedGrid";
import Header from "./header/Header";

const StreamMixerApp: FC = () => (
  <>
    <Header />
    <EmbedGrid />
  </>
);

export default StreamMixerApp;
