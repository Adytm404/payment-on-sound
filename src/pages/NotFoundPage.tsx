import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";

export default function NotFoundPage() {
  return (
    <div className="screen items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary">
        <Icon name="compass" size={32} />
      </div>
      <h1 className="mt-4 text-lg font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-1 max-w-[280px] text-sm text-ink-muted">
        Tautan yang Anda buka tidak tersedia. Kembali ke beranda untuk melanjutkan.
      </p>
      <Link to="/" className="btn-primary mt-5">
        <Icon name="house" size={16} />
        Ke Beranda
      </Link>
    </div>
  );
}
