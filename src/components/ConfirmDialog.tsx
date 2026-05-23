import { Icon } from "./Icon";
import { Modal } from "./Modal";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const danger = tone === "danger";

  return (
    <Modal open={open} onClose={onCancel} title={title} description={description}>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-[1.25rem] px-5 py-3 text-sm font-extrabold text-white shadow-card transition active:scale-[0.98] disabled:opacity-50 ${
            danger ? "bg-rose-600" : "bg-ink"
          }`}
        >
          {loading ? (
            <Icon name="loader-circle" size={16} className="animate-spin" />
          ) : danger ? (
            <Icon name="triangle-alert" size={16} />
          ) : (
            <Icon name="check" size={16} />
          )}
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-secondary w-full disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}
