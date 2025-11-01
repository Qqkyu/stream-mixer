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
        <div className="flex gap-2 items-center">
          <button
            className="btn btn-sm btn-circle"
            onClick={() => document.getElementById("my_modal_2").showModal()}
          >
            ?
          </button>
          <dialog id="my_modal_2" className="modal">
            <div className="modal-box max-w-2xl">
              <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                  ✕
                </button>
              </form>
              <h3 className="font-bold text-lg mb-4">How to Embed Streams</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-md mb-2 text-(--color-twitch)">
                    Twitch
                  </h4>
                  <p className="text-sm mb-2">
                    Enter the channel name exactly as it appears in the URL.
                    Example:
                  </p>
                  <div className="bg-base-200 p-3 rounded text-sm">
                    <p className="mb-1">
                      For:{" "}
                      <code className="text-accent">twitch.tv/lofigirl</code>
                    </p>
                    <p>
                      Enter:{" "}
                      <code className="text-accent font-semibold">
                        lofigirl
                      </code>
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-md mb-2 text-(--color-youtube)">
                    YouTube
                  </h4>
                  <p className="text-sm mb-2">
                    Enter the video ID from the URL (the part after{" "}
                    <span className="text-accent">?v=</span>). Example:
                  </p>
                  <div className="bg-base-200 p-3 rounded text-sm">
                    <p className="mb-1">
                      For:{" "}
                      <code className="text-accent">
                        youtube.com/watch?v=jfKfPfyJRdk
                      </code>
                    </p>
                    <p>
                      Enter:{" "}
                      <code className="text-accent font-semibold">
                        jfKfPfyJRdk
                      </code>
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-md mb-2 text-(--color-kick)">
                    Kick
                  </h4>
                  <p className="text-sm mb-2">
                    Enter the channel name exactly as it appears in the URL.
                    Example:
                  </p>
                  <div className="bg-base-200 p-3 rounded text-sm">
                    <p className="mb-1">
                      For:{" "}
                      <code className="text-accent">kick.com/lofigirl</code>
                    </p>
                    <p>
                      Enter:{" "}
                      <code className="text-accent font-semibold">
                        lofigirl
                      </code>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button>close</button>
            </form>
          </dialog>
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
    )
  );
};

export default Header;
