import coin from "@/assets/battleasia-coin.png";

interface Props {
  size?: number;
  className?: string;
}

export function CoinIcon({ size = 16, className = "" }: Props) {
  return (
    <img
      src={coin}
      alt=""
      width={size}
      height={size}
      className={`inline-block object-contain drop-shadow-[0_0_4px_rgba(255,176,32,0.5)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
