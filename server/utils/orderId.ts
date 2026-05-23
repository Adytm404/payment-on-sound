const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateOrderId(prefix = "POS") {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  let rand = "";
  for (let i = 0; i < 5; i++) rand += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix}${yy}${mm}${dd}${hh}${rand}`;
}
