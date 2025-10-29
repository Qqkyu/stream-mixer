import { atom } from "nanostores";
import type { Embed } from "../components/embedGrid/EmbedTypes";

export const embeds = atom<Array<Embed>>(getLocalStorageEmbeds());

export function addEmbed(embed: Embed) {
  embeds.set(embeds.get().toSpliced(embeds.get().length, 0, embed));
  setLocalStorageEmbeds();
}

export function setEmbeds(newEmbeds: Array<Embed>) {
  embeds.set(newEmbeds);
  setLocalStorageEmbeds();
}

function getLocalStorageEmbeds(): Array<Embed> {
  if (typeof window == "undefined") {
    return [];
  }

  const localStorageEmbeds = localStorage.getItem("stream-embeds");

  if (localStorageEmbeds == null) {
    return [];
  }

  const parsedStorageEmbeds = JSON.parse(localStorageEmbeds);

  return Array.isArray(parsedStorageEmbeds) ? parsedStorageEmbeds : [];
}

function setLocalStorageEmbeds(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("stream-embeds", JSON.stringify(embeds.get()));
}
