import type { FC } from "react";

type Props = {
  type: "small" | "big";
};

const HelpModalButton: FC<Props> = ({ type }) => {
  const openModal = () => {
    const modalEl = document.getElementById("help-modal");
    if (modalEl) {
      (modalEl as HTMLDialogElement).showModal();
    }
  };

  return type === "small" ? (
    <button className="btn btn-sm btn-circle" onClick={openModal}>
      ?
    </button>
  ) : (
    <button className="btn btn-primary" onClick={openModal}>
      Help
    </button>
  );
};

export default HelpModalButton;
