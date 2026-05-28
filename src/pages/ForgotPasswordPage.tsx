import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengirim email", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-8">
      <div className="mx-auto w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/qris-logo.svg" alt="QRIS" className="h-12 w-auto" />
          <div>
            <h1 className="text-2xl font-extrabold">Lupa Password</h1>
            <p className="text-sm text-ink-muted">
              {sent
                ? "Link reset password telah dikirim ke email kamu"
                : "Masukkan email untuk mereset password"}
            </p>
          </div>
        </div>

        {sent ? (
          <div className="card flex flex-col items-center gap-4 p-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name="mail-check" size={28} />
            </div>
            <p className="text-sm text-ink-muted">
              Cek inbox <strong>{email}</strong> dan klik link reset password. Link berlaku 1 jam.
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-sm font-semibold text-[#D71920]"
            >
              Kirim ulang
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
            <input
              className="input"
              type="email"
              placeholder="Email akun kamu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-4 text-base font-extrabold text-white shadow-card disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Icon name="loader-circle" size={18} className="animate-spin" /> : <Icon name="send" size={18} />}
              Kirim Link Reset
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-ink-muted">
          Ingat password? {" "}
          <Link to="/login" className="font-extrabold text-[#D71920]">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
