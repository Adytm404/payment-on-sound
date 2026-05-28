import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      showToast("Konfirmasi password tidak cocok", "error");
      return;
    }
    if (!token) {
      showToast("Token reset tidak valid", "error");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      showToast("Password berhasil diubah", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mereset password", "error");
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
            <h1 className="text-2xl font-extrabold">
              {done ? "Password Berhasil Diubah" : "Password Baru"}
            </h1>
            <p className="text-sm text-ink-muted">
              {done
                ? "Silakan masuk dengan password baru kamu"
                : "Masukkan password baru untuk akun kamu"}
            </p>
          </div>
        </div>

        {done ? (
          <div className="card flex flex-col gap-3 p-5">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-4 text-base font-extrabold text-white shadow-card"
            >
              <Icon name="log-in" size={18} />
              Masuk
            </Link>
          </div>
        ) : !token ? (
          <div className="card flex flex-col items-center gap-4 p-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Icon name="link-x" size={28} />
            </div>
            <p className="text-sm text-ink-muted">
              Link reset password tidak valid atau sudah kedaluwarsa.
            </p>
            <Link to="/forgot-password" className="text-sm font-semibold text-[#D71920]">
              Minta link baru
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
            <input
              className="input"
              type="password"
              placeholder="Password baru"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              className="input"
              type="password"
              placeholder="Konfirmasi password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-4 text-base font-extrabold text-white shadow-card disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Icon name="loader-circle" size={18} className="animate-spin" /> : <Icon name="key-round" size={18} />}
              Simpan Password
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-ink-muted">
          <Link to="/login" className="font-extrabold text-[#D71920]">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
