import React, { useEffect, useState, type ChangeEvent } from "react";
import { addEmbed } from "../../state/embedsStore";
import { fullscreenEmbed } from "../../state/layoutStore";
import type { Embed } from "../embedGrid/EmbedTypes";
import UserIcon from "../icons/UserIcon";
import { DEFAULT_POSITION } from "../embedGrid/embed/position";
import { useStore } from "@nanostores/react";
import HelpModalButton from "../helpModal/HelpModalButton";
import { PLATFORM_STYLES } from "../embedGrid/platformStyles";
import { parseStreamInput } from "./parseStreamInput";
import {
  compactMode,
  hydratePreferences,
  setCompactMode,
} from "../../state/preferencesStore";
import ShareWorkspaceButton from "../shareWorkspace/ShareWorkspaceButton";
import SharedLayoutImporter from "../shareWorkspace/SharedLayoutImporter";
import { MAX_STREAM_INPUT_LENGTH } from "../embedGrid/embedIdentifiers";

const Header: React.FC = () => {
  const fullscreenEmbedStore = useStore(fullscreenEmbed);
  const compactModeStore = useStore(compactMode);

  const [platform, setPlatform] = useState<Embed["platform"]>("twitch");
  const [channel, setChannel] = useState<Embed["channel"]>("");
  const [type, setType] = useState<Embed["type"]>("everything");
  const [streamInputInvalid, setStreamInputInvalid] = useState(false);
  const platformStyle = PLATFORM_STYLES[platform];

  useEffect(() => {
    hydratePreferences();
  }, []);

  const handlePlatformSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Embed["platform"];
    setPlatform(value);
  };

  const handleStreamInput = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const parsedInput = parseStreamInput(value, platform);

    setChannel(value);
    setStreamInputInvalid(false);

    if (parsedInput && parsedInput.platform !== platform) {
      setPlatform(parsedInput.platform);
    }
  };

  const addStream = () => {
    const parsedInput = parseStreamInput(channel, platform);
    if (!parsedInput) {
      setStreamInputInvalid(true);
      return;
    }

    addEmbed({
      id: crypto.randomUUID(),
      ...parsedInput,
      type,
      position: { ...DEFAULT_POSITION },
    });
  };

  const toggleFullscreenMode = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.body.requestFullscreen();
    }
  };

  if (fullscreenEmbedStore != null) return null;

  return (
    <>
      {!compactModeStore && (
        <div className="navbar justify-between bg-base-100 px-2 shadow-sm">
          <div>
            <a href="/" className="btn btn-ghost text-xl">
              Stream Mix
            </a>
          </div>
          <div className="flex gap-2 items-center">
            <ShareWorkspaceButton />
            <HelpModalButton type="small" />
            <label className="label gap-2 cursor-pointer">
              <span className="text-sm whitespace-nowrap">Compact mode</span>
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={compactModeStore}
                onChange={(event) => setCompactMode(event.target.checked)}
              />
            </label>
            <button
              className="btn btn-sm btn-circle"
              onClick={toggleFullscreenMode}
              aria-label="Toggle browser fullscreen"
              title="Toggle browser fullscreen"
            >
              ⤢
            </button>
            <div className="join">
              <select
                className={`select join-item w-32 border-l-4 ${platformStyle.border}`}
                value={platform}
                onChange={handlePlatformSelect}
              >
                <option value="twitch">Twitch</option>
                <option value="youtube">Youtube</option>
                <option value="kick">Kick</option>
              </select>
              <label
                className={`input ${streamInputInvalid ? "input-error" : ""}`}
              >
                <UserIcon />
                <input
                  type="text"
                  required
                  maxLength={MAX_STREAM_INPUT_LENGTH}
                  placeholder="Channel, video ID, or URL"
                  className="join-item"
                  value={channel}
                  onChange={handleStreamInput}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addStream();
                  }}
                  aria-invalid={streamInputInvalid}
                  title={
                    streamInputInvalid
                      ? "Enter a Twitch or Kick channel, YouTube video ID, or a supported stream URL"
                      : undefined
                  }
                />
              </label>
              <select
                className="select join-item w-44"
                value={type}
                onChange={(e) => setType(e.target.value as Embed["type"])}
              >
                <option value="everything">Stream + Chat</option>
                <option value="video">Stream</option>
                <option value="chat">Chat</option>
              </select>
              <button
                disabled={channel.trim() === ""}
                onClick={addStream}
                className="btn btn-primary join-item"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      <SharedLayoutImporter />
    </>
  );
};

export default Header;
