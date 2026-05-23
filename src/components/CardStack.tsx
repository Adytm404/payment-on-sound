type Props = {
  className?: string;
};

/**
 * Stack of stylized payment cards used as a hero visual on the dashboard,
 * mirroring the Clyne reference design.
 */
export function CardStack({ className = "" }: Props) {
  return (
    <div className={`relative h-44 w-full ${className}`}>
      {/* Back card – primary */}
      <div className="absolute right-2 top-2 h-32 w-56 rotate-[6deg] rounded-2xl bg-primary p-4 text-white shadow-glow">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
            Merchant
          </span>
          <span className="text-xs font-bold italic tracking-wider">VISA</span>
        </div>
        <div className="mt-7 text-xs font-medium tracking-[0.3em] text-white/80">
          •••• •••• •••• 2143
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70">
          <span>04/29</span>
          <span>QRIS</span>
        </div>
      </div>

      {/* Front card – dark */}
      <div className="absolute left-3 top-7 h-32 w-56 -rotate-[8deg] rounded-2xl bg-ink p-4 text-white shadow-card">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
            Pasound
          </span>
          <span className="text-xs font-bold italic tracking-wider">VISA</span>
        </div>
        <div className="mt-7 text-xs font-medium tracking-[0.3em] text-white/80">
          •••• •••• •••• 9024
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/60">
          <span>10/30</span>
          <span>POS</span>
        </div>
      </div>
    </div>
  );
}
