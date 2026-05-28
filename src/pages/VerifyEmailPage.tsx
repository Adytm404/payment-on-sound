import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token verifikasi tidak ditemukan.");
      return;
    }
    api
      .verifyEmail(token)
      .then((res) => {
        if (res.message?.includes("sudah terverifikasi")) {
          setStatus("already");
          setMessage("Email kamu sudah terverifikasi sebelumnya.");
        } else {
          setStatus("success");
          setMessage("Email berhasil diverifikasi!");
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Gagal verifikasi email");
      });
  }, [token]);

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-8">
      <div className="mx-auto w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/qris-logo.svg" alt="QRIS" className="h-12 w-auto" />
          <h1 className="text-2xl font-extrabold">Verifikasi Email</h1>
        </div>

        <div className="card flex flex-col items-center gap-4 p-5 text-center">
          {status === "loading" ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <Icon name="loader-circle" size={28} className="animate-spin" />
              </div>
              <p className="text-sm text-ink-muted">Memverifikasi email kamu...</p>
            </>
          ) : status === "success" || status === "already" ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="mail-check" size={28} />
              </div>
              <p className="text-sm text-ink-muted">{message}</p>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-3 text-sm font-extrabold text-white shadow-card"
              >
                <Icon name="layout-dashboard" size={16} />
                Ke Dashboard
              </Link>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Icon name="mail-x" size={28} />
              </div>
              <p className="text-sm text-ink-muted">{message}</p>
              <Link
                to="/login"
                className="text-sm font-semibold text-[#D71920]"
              >
                Kembali ke halaman masuk
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
