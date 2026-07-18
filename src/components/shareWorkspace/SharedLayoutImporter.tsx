import { useEffect, useRef, useState, type FC } from "react";
import { embeds, hydrateEmbeds, setEmbeds } from "../../state/embedsStore";
import {
  createEmbedsFromSharedStreams,
  parseSharedLayoutHash,
  removeSharedLayoutHash,
  type SharedLayoutResult,
} from "./shareLayout";

type ValidSharedLayout = Extract<SharedLayoutResult, { status: "valid" }>;

const SharedLayoutImporter: FC = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const [pendingLayout, setPendingLayout] = useState<ValidSharedLayout>();
  const [invalidLayout, setInvalidLayout] = useState(false);
  const [showImportedNotice, setShowImportedNotice] = useState(false);

  useEffect(() => {
    const readSharedLayout = () => {
      hydrateEmbeds();

      const result = parseSharedLayoutHash(window.location.hash);
      if (result.status === "absent") return;

      if (result.status === "invalid") {
        setInvalidLayout(true);
        return;
      }

      if (embeds.get().length > 0) {
        setPendingLayout(result);
        return;
      }

      setEmbeds(createEmbedsFromSharedStreams(result.streams));
      removeSharedLayoutHash();
      setShowImportedNotice(true);
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = window.setTimeout(
        () => setShowImportedNotice(false),
        2500,
      );
    };

    readSharedLayout();
    window.addEventListener("hashchange", readSharedLayout);
    return () => window.removeEventListener("hashchange", readSharedLayout);
  }, []);

  useEffect(() => {
    if ((pendingLayout || invalidLayout) && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [invalidLayout, pendingLayout]);

  useEffect(
    () => () => {
      window.clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  const dismissSharedLayout = () => {
    dialogRef.current?.close();
    removeSharedLayoutHash();
    setPendingLayout(undefined);
    setInvalidLayout(false);
  };

  const replaceWorkspace = () => {
    if (!pendingLayout) return;

    setEmbeds(createEmbedsFromSharedStreams(pendingLayout.streams));
    removeSharedLayoutHash();
    window.location.reload();
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        className="modal"
        onCancel={(event) => {
          event.preventDefault();
          dismissSharedLayout();
        }}
      >
        <div className="modal-box max-w-lg">
          {invalidLayout ? (
            <>
              <h2 className="text-lg font-bold">
                Shared workspace couldn't be opened
              </h2>
              <p className="py-4">
                The link is incomplete, invalid, or uses a newer format that
                this version of Stream Mix doesn't support.
              </p>
              <div className="modal-action">
                <button
                  className="btn btn-primary"
                  onClick={dismissSharedLayout}
                >
                  Close
                </button>
              </div>
            </>
          ) : pendingLayout ? (
            <>
              <h2 className="text-lg font-bold">
                Replace your current workspace?
              </h2>
              <p className="py-4">
                This shared link contains {pendingLayout.streams.length}{" "}
                {pendingLayout.streams.length === 1 ? "stream" : "streams"}.
                Opening it will replace the workspace currently saved in this
                browser.
              </p>
              <div className="modal-action">
                <button className="btn" onClick={dismissSharedLayout}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={replaceWorkspace}>
                  Replace workspace
                </button>
              </div>
            </>
          ) : null}
        </div>
        <button
          className="modal-backdrop"
          onClick={dismissSharedLayout}
          aria-label="Close"
        >
          close
        </button>
      </dialog>
      {showImportedNotice && (
        <div className="toast toast-top toast-center z-[3000]">
          <div role="status" className="alert alert-success shadow-lg">
            <span>Shared workspace opened</span>
          </div>
        </div>
      )}
    </>
  );
};

export default SharedLayoutImporter;
