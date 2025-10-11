import React, { useState } from "react";
import { addEmbed } from "../../state/embedsStore";
import type { Embed } from "../embed/EmbedTypes";

const StreamInput: React.FC = () => {
  const [platform, setPlatform] = useState<Embed["platform"]>("twitch");
  const [channel, setChannel] = useState<Embed["channel"]>("");
  const [type, setType] = useState<Embed["type"]>("everything");

  return (
    <div className="join">
      <select
        className="select join-item"
        value={platform}
        onChange={(e) => setPlatform(e.target.value as Embed["platform"])}
      >
        <option value="twitch">Twitch</option>
      </select>
      <label className="input">
        <svg
          className="h-[1em] opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <g
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="2.5"
            fill="none"
            stroke="currentColor"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </g>
        </svg>
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
        onClick={() => addEmbed({ platform, channel, type })}
        className="btn btn-primary join-item"
      >
        Add
      </button>
    </div>
  );
};

export default StreamInput;
