import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

type StepState = "done" | "current" | "todo";

type Step = {
  key: string;
  label: string;
  description: string;
  state: StepState;
};

type Props = {
  emailVerified: boolean;
  merchantStatus: string;
  isConfigured: boolean;
};

export function OnboardingProgress({ emailVerified, merchantStatus, isConfigured }: Props) {
  const merchantSubmitted = merchantStatus !== "draft";
  const verified = merchantStatus === "verified";
  const integrationReady = verified && isConfigured;

  // The merchant is fully onboarded; nothing to show.
  if (emailVerified && integrationReady) return null;

  const verifyState: StepState = emailVerified ? "done" : "current";

  let dataState: StepState = "todo";
  if (merchantStatus === "verified" || merchantStatus === "pending_review") dataState = "done";
  else if (emailVerified) dataState = "current";

  let reviewState: StepState = "todo";
  if (verified) reviewState = "done";
  else if (merchantStatus === "pending_review") reviewState = "current";
  else if (merchantStatus === "needs_revision" || merchantStatus === "rejected") reviewState = "current";

  let readyState: StepState = "todo";
  if (integrationReady) readyState = "done";
  else if (verified) readyState = "current";

  const reviewLabel =
    merchantStatus === "needs_revision"
      ? "Perlu perbaikan"
      : merchantStatus === "rejected"
        ? "Pendaftaran ditolak"
        : merchantStatus === "pending_review"
          ? "Menunggu verifikasi admin"
          : "Verifikasi admin";

  const reviewDescription =
    merchantStatus === "needs_revision"
      ? "Admin meminta perbaikan data. Cek catatan di pengaturan."
      : merchantStatus === "rejected"
        ? "Perbaiki data dan ajukan ulang dari pengaturan."
        : merchantStatus === "pending_review"
          ? "Biasanya selesai dalam 1×24 jam kerja."
          : "Admin meninjau data merchant kamu.";

  const readyDescription = verified && !isConfigured
    ? "Integrasi pembayaran sedang disiapkan admin."
    : "Buat QRIS pertamamu dan mulai terima pembayaran.";

  const steps: Step[] = [
    { key: "verify", label: "Verifikasi email", description: emailVerified ? "Email kamu sudah terverifikasi." : "Cek inbox dan klik tautan verifikasi.", state: verifyState },
    { key: "data", label: "Lengkapi data merchant", description: merchantSubmitted ? "Data merchant sudah dikirim." : "Isi nama, KTP, dan rekening penarikan.", state: dataState },
    { key: "review", label: reviewLabel, description: reviewDescription, state: reviewState },
    { key: "ready", label: "Siap terima pembayaran", description: readyDescription, state: readyState },
  ];

  const doneCount = steps.filter((s) => s.state === "done").length;

  const handleResend = async () => {
    try {
      await api.resendVerification();
      showToast("Email verifikasi telah dikirim ulang", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengirim email verifikasi", "error");
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Aktivasi akun</h3>
          <p className="text-[11px] text-ink-muted">Selesaikan langkah ini untuk mulai menerima pembayaran</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#FFF1F1] px-3 py-1 text-[11px] font-extrabold text-[#D71920]">
          {doneCount}/{steps.length}
        </span>
      </div>

      <ol className="flex flex-col gap-1">
        {steps.map((step, idx) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  step.state === "done"
                    ? "bg-emerald-100 text-emerald-700"
                    : step.state === "current"
                      ? "bg-[#D71920] text-white"
                      : "bg-surface-alt text-ink-soft"
                }`}
              >
                {step.state === "done" ? <Icon name="check" size={14} /> : idx + 1}
              </span>
              {idx < steps.length - 1 ? (
                <span className={`my-1 w-0.5 flex-1 ${step.state === "done" ? "bg-emerald-200" : "bg-surface-alt"}`} />
              ) : null}
            </div>
            <div className="pb-3">
              <p className={`text-sm font-bold ${step.state === "todo" ? "text-ink-soft" : "text-ink"}`}>{step.label}</p>
              <p className="text-[11px] text-ink-muted">{step.description}</p>
              {step.key === "verify" && step.state === "current" ? (
                <button type="button" onClick={handleResend} className="mt-1.5 text-[11px] font-extrabold text-[#D71920]">
                  Kirim ulang email verifikasi
                </button>
              ) : null}
              {step.key === "data" && step.state === "current" ? (
                <Link to="/pengaturan" className="mt-1.5 inline-block text-[11px] font-extrabold text-[#D71920]">
                  Lengkapi data merchant
                </Link>
              ) : null}
              {step.key === "review" && (merchantStatus === "needs_revision" || merchantStatus === "rejected") ? (
                <Link to="/pengaturan" className="mt-1.5 inline-block text-[11px] font-extrabold text-[#D71920]">
                  Perbaiki data
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
