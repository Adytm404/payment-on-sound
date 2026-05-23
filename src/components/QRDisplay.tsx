import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Props = {
  value: string;
  size?: number;
  className?: string;
};

export function QRDisplay({ value, size = 260, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    setError(null);
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0F0F12",
        light: "#FFFFFF",
      },
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Gagal render QR");
    });
  }, [value, size]);

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-card backdrop-blur ${className}`}
    >
      <div className="flex items-center justify-center">
        <canvas ref={canvasRef} width={size} height={size} className="rounded-xl" />
      </div>
      {error ? (
        <p className="mt-3 text-center text-xs text-rose-600">{error}</p>
      ) : null}
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-black/5" />
    </div>
  );
}
