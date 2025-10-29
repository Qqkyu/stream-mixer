import React, { useState, type ChangeEvent } from "react";
import { addEmbed } from "../../state/embedsStore";
import { fullscreenEmbed } from "../../state/layoutStore";
import type { Embed } from "../embedGrid/EmbedTypes";
import UserIcon from "../icons/UserIcon";
import { DEFAULT_POSITION } from "../embedGrid/embed/position";
import { useStore } from "@nanostores/react";

const Header: React.FC = () => {
  const fullscreenEmbedStore = useStore(fullscreenEmbed);

  const [platform, setPlatform] = useState<Embed["platform"]>("twitch");
  const [channel, setChannel] = useState<Embed["channel"]>("");
  const [type, setType] = useState<Embed["type"]>("everything");

  const handlePlatformSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Embed["platform"];
    setPlatform(value);
  };

  return (
    fullscreenEmbedStore == null && (
      <div className="navbar justify-between bg-base-100 shadow-sm">
        <div>
          <a className="btn btn-ghost text-xl">Stream Mix</a>
        </div>
        <div className="join">
          <select
            className="select join-item"
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
            className="select join-item"
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
    )
  );
};

export default Header;
