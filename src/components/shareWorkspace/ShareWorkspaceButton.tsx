import { useEffect, useRef, useState, type FC } from "react";
import { embeds, hydrateEmbeds } from "../../state/embedsStore";
import { createShareUrl } from "./shareLayout";

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();

    const copied = document.execCommand("copy");
    textArea.remove();
    if (!copied) throw new Error("Copy failed");
  }
}

const ShareWorkspaceButton: FC = () => {
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const [embedCount, setEmbedCount] = useState(0);
  const [notice, setNotice] = useState<
    { type: "success" | "error"; message: string } | undefined
  >();

  useEffect(() => {
    hydrateEmbeds();
    const unsubscribe = embeds.subscribe((currentEmbeds) => {
      setEmbedCount(currentEmbeds.length);
    });

    return () => {
      unsubscribe();
      window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const showNotice = (type: "success" | "error", message: string) => {
    window.clearTimeout(noticeTimerRef.current);
    setNotice({ type, message });
    noticeTimerRef.current = window.setTimeout(
      () => setNotice(undefined),
      2500,
    );
  };

  const shareWorkspace = async () => {
    try {
      const shareUrl = createShareUrl(window.location.href, embeds.get());
      await copyText(shareUrl);
      showNotice("success", "Share link copied");
    } catch {
      showNotice("error", "Couldn't copy the share link");
    }
  };

  return (
    <>
      <button
        className="btn btn-sm btn-circle"
        disabled={embedCount === 0}
        onClick={shareWorkspace}
        aria-label="Copy workspace share link"
        title={
          embedCount === 0
            ? "Add a stream before sharing"
            : "Copy workspace share link"
        }
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4" />
          <path d="m8.6 13.5 6.8 4" />
        </svg>
      </button>
      {notice && (
        <div className="toast toast-top toast-center z-[3000]">
          <div
            role="status"
            className={`alert shadow-lg ${notice.type === "success" ? "alert-success" : "alert-error"}`}
          >
            <span>{notice.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareWorkspaceButton;
