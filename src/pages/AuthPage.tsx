import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";
import { useAuth } from "@/store/AuthContext";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = isRegister ? await register({ name, email, password }) : await login({ email, password });
      navigate(user.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal autentikasi", "error");
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
            <h1 className="text-2xl font-extrabold">{isRegister ? "Buat Akun" : "Masuk"}</h1>
            <p className="text-sm text-ink-muted">
              {isRegister ? "Mulai simpan transaksi ke MySQL" : "Lanjutkan kelola pembayaran QRIS"}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
          {isRegister ? (
            <input className="input" placeholder="Nama merchant" value={name} onChange={(e) => setName(e.target.value)} required />
          ) : null}
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-4 text-base font-extrabold text-white shadow-card disabled:opacity-50" disabled={loading}>
            {loading ? <Icon name="loader-circle" size={18} className="animate-spin" /> : <Icon name={isRegister ? "user-plus" : "log-in"} size={18} />}
            {isRegister ? "Daftar" : "Masuk"}
          </button>
        </form>

        {mode === "login" ? (
          <p className="text-center text-sm">
            <Link to="/forgot-password" className="font-semibold text-ink-muted hover:text-[#D71920]">
              Lupa password?
            </Link>
          </p>
        ) : null}

        <p className="mt-5 text-center text-sm text-ink-muted">
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"} {" "}
          <Link to={isRegister ? "/login" : "/register"} className="font-extrabold text-[#D71920]">
            {isRegister ? "Masuk" : "Daftar"}
          </Link>
        </p>
      </div>
    </div>
  );
}
