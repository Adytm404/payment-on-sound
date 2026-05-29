import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";

export function InstallPwaBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  const handleInstall = async () => {
    try {
      await promptInstall();
    } catch {
      showToast("Gagal membuka dialog install", "error");
    }
  };

  return (
    <div className="mx-5 mt-5 flex items-center justify-between gap-3 rounded-3xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary">
      <span className="flex items-center gap-2">
        <Icon name="download" size={16} />
        Install Pasound di perangkatmu
      </span>
      <button
        type="button"
        onClick={handleInstall}
        className="shrink-0 rounded-full bg-[#D71920] px-3 py-1 text-xs font-bold text-white"
      >
        Install
      </button>
    </div>
  );
}
