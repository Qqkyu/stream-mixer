import { atom } from "nanostores";
import type { Embed } from "../components/embed/EmbedTypes";

export const embeds = atom<Array<Embed>>(getLocalStorageEmbeds());

export function addEmbed(embed: Embed) {
  embeds.set(embeds.get().toSpliced(embeds.get().length, 0, embed));
  setLocalStorageEmbeds(embed);
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

function setLocalStorageEmbeds(embed: Embed): void {
  if (typeof window === "undefined") {
    return;
  }

  const localStorageEmbeds = getLocalStorageEmbeds();

  localStorageEmbeds.push(embed);

  localStorage.setItem("stream-embeds", JSON.stringify(localStorageEmbeds));
}
