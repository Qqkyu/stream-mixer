import React, { useEffect, useState, type ChangeEvent } from "react";
import { addEmbed } from "../../state/embedsStore";
import { fullscreenEmbed } from "../../state/layoutStore";
import type { Embed } from "../embedGrid/EmbedTypes";
import UserIcon from "../icons/UserIcon";
import { DEFAULT_POSITION } from "../embedGrid/embed/position";
import { useStore } from "@nanostores/react";
import HelpModalButton from "../helpModal/HelpModalButton";
import {
  compactMode,
  hydratePreferences,
  setCompactMode,
} from "../../state/preferencesStore";

const Header: React.FC = () => {
  const fullscreenEmbedStore = useStore(fullscreenEmbed);
  const compactModeStore = useStore(compactMode);

  const [platform, setPlatform] = useState<Embed["platform"]>("twitch");
  const [channel, setChannel] = useState<Embed["channel"]>("");
  const [type, setType] = useState<Embed["type"]>("everything");
  const [showCompactModeExit, setShowCompactModeExit] = useState(false);

  useEffect(() => {
    hydratePreferences();
  }, []);

  useEffect(() => {
    if (!compactModeStore) {
      setShowCompactModeExit(false);
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setShowCompactModeExit(event.clientY <= 48);
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [compactModeStore]);

  const handlePlatformSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Embed["platform"];
    setPlatform(value);
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
                className="select join-item w-32"
                value={platform}
                onChange={handlePlatformSelect}
              >
                <option value="twitch">Twitch</option>
                <option value="youtube">Youtube</option>
                <option value="kick">Kick</option>
              </select>
              <label className="input">
                <UserIcon />
                <input
                  type="url"
                  required
                  placeholder="Channel"
                  className="join-item"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
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
                disabled={channel === ""}
                onClick={() =>
                  addEmbed({
                    id: crypto.randomUUID(),
                    platform,
                    channel,
                    type,
                    position: { ...DEFAULT_POSITION },
                  })
                }
                className="btn btn-primary join-item"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      {compactModeStore && (
        <div className="pointer-events-none fixed top-0 left-1/2 z-[2000] -translate-x-1/2">
          <button
            className={`btn btn-primary btn-sm btn-circle text-lg font-bold shadow-md transition-[opacity,transform] duration-150 ${showCompactModeExit ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"}`}
            onClick={() => setCompactMode(false)}
            onFocus={() => setShowCompactModeExit(true)}
            onBlur={() => setShowCompactModeExit(false)}
            aria-label="Exit compact mode"
            title="Exit compact mode"
          >
            ↓
          </button>
        </div>
      )}
    </>
  );
};

export default Header;
