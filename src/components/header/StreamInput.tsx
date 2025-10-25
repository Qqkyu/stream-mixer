import React, { useState, type ChangeEvent } from "react";
import { addEmbed } from "../../state/embedsStore";
import type { Embed } from "../embed/EmbedTypes";
import UserIcon from "../icons/UserIcon";
import { DEFAULT_POSITION } from "../embed/embed/position";

const StreamInput: React.FC = () => {
  const [platform, setPlatform] = useState<Embed["platform"]>("twitch");
  const [channel, setChannel] = useState<Embed["channel"]>("");
  const [type, setType] = useState<Embed["type"]>("everything");

  const handlePlatformSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Embed["platform"];
    setPlatform(value);

    if (value === "kick") {
      setType("video");
    }
  };

  return (
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
        <option disabled={platform === "kick"} value="everything">
          Stream + Chat
        </option>
        <option value="video">Stream</option>
        <option disabled={platform === "kick"} value="chat">
          Chat
        </option>
      </select>
      <button
        disabled={channel === ""}
        onClick={() =>
          addEmbed({
            platform,
            channel,
            type,
            position: DEFAULT_POSITION,
          })
        }
        className="btn btn-primary join-item"
      >
        Add
      </button>
    </div>
  );
};

export default StreamInput;
