export type WatermarkState = {
  enabled: boolean;
  position: { x: number; y: number };
  fontSize: number;
  opacity: number;
  font: "system" | "rounded" | "serif" | "mono" | "script";
};

export const DEFAULT_WATERMARK_STATE: WatermarkState = {
  enabled: true,
  position: { x: 0.85, y: 0.85 },
  fontSize: 24,
  opacity: 0.4,
  font: "system",
};

export function WatermarkEditor() {
  return null;
}
