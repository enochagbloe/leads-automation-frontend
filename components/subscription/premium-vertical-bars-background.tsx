"use client";

import { useCallback, useEffect, useRef } from "react";

type PremiumVerticalBarsBackgroundProps = {
  backgroundColor?: string;
  lineColor?: string;
  barColor?: string;
  lineWidth?: number;
  animationSpeed?: number;
};

function hexToRgb(hex: string) {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: Number.parseInt(cleanHex.slice(0, 2), 16),
    g: Number.parseInt(cleanHex.slice(2, 4), 16),
    b: Number.parseInt(cleanHex.slice(4, 6), 16),
  };
}

export function PremiumVerticalBarsBackground({
  backgroundColor = "#0f1512",
  lineColor = "#d5ad59",
  barColor = "#f7f1de",
  lineWidth = 1,
  animationSpeed = 0.00055,
}: PremiumVerticalBarsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const animateRef = useRef<() => void>(() => {});
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  const ripples = useRef<Array<{ x: number; y: number; time: number; intensity: number }>>([]);

  const noise = useCallback((x: number, y: number, t: number) => {
    const n =
      Math.sin(x * 0.01 + t) * Math.cos(y * 0.01 + t) +
      Math.sin(x * 0.015 - t) * Math.cos(y * 0.005 + t);
    return (n + 1) / 2;
  }, []);

  const getMouseInfluence = useCallback((x: number, y: number) => {
    const dx = x - mouseRef.current.x;
    const dy = y - mouseRef.current.y;
    return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 180);
  }, []);

  const getRippleInfluence = useCallback((x: number, y: number, currentTime: number) => {
    let totalInfluence = 0;
    for (const ripple of ripples.current) {
      const age = currentTime - ripple.time;
      if (age >= 1800) continue;
      const dx = x - ripple.x;
      const dy = y - ripple.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const rippleRadius = (age / 1800) * 260;
      const rippleWidth = 46;
      if (Math.abs(distance - rippleRadius) < rippleWidth) {
        totalInfluence += (1 - age / 1800) * ripple.intensity * (1 - Math.abs(distance - rippleRadius) / rippleWidth);
      }
    }
    return Math.min(totalInfluence, 1.6);
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    animateRef.current = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      timeRef.current += animationSpeed;
      const currentTime = Date.now();
      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      const lineCount = Math.max(12, Math.floor(canvasHeight / 11));
      const lineSpacing = canvasHeight / lineCount;
      const lineRgb = hexToRgb(lineColor);
      const barRgb = hexToRgb(barColor);

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      for (let i = 0; i < lineCount; i += 1) {
        const y = i * lineSpacing + lineSpacing / 2;
        const lineInfluence = getMouseInfluence(canvasWidth / 2, y);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${lineRgb.r}, ${lineRgb.g}, ${lineRgb.b}, ${0.16 + lineInfluence * 0.28})`;
        ctx.lineWidth = lineWidth + lineInfluence;
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();

        for (let x = 0; x < canvasWidth; x += 8) {
          const noiseVal = noise(x, y, timeRef.current);
          const mouseInfluence = getMouseInfluence(x, y);
          const rippleInfluence = getRippleInfluence(x, y, currentTime);
          const totalInfluence = mouseInfluence + rippleInfluence;
          if (noiseVal <= Math.max(0.24, 0.54 - mouseInfluence * 0.18 - rippleInfluence * 0.08)) continue;

          const barWidth = 2.5 + noiseVal * 9 + totalInfluence * 4;
          const barHeight = 1.5 + noiseVal * 3 + totalInfluence * 2.5;
          const animatedX =
            x +
            Math.sin(timeRef.current + y * 0.0375) * 18 * noiseVal +
            (mouseRef.current.isDown ? Math.sin(timeRef.current * 3 + x * 0.01) * 8 * mouseInfluence : 0) +
            rippleInfluence * Math.sin(timeRef.current * 2 + x * 0.02) * 12;

          const intensity = Math.min(0.92, Math.max(0.52, 0.55 + totalInfluence * 0.24));
          ctx.fillStyle = `rgba(${barRgb.r}, ${barRgb.g}, ${barRgb.b}, ${intensity})`;
          ctx.fillRect(animatedX - barWidth / 2, y - barHeight / 2, barWidth, barHeight);
        }
      }

      ripples.current = ripples.current.filter((ripple) => currentTime - ripple.time < 1800);
      animationFrameId.current = window.requestAnimationFrame(animateRef.current);
    };
  }, [animationSpeed, backgroundColor, barColor, getMouseInfluence, getRippleInfluence, lineColor, lineWidth, noise]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = event.clientX - rect.left;
      mouseRef.current.y = event.clientY - rect.top;
    };
    const createRipple = (event: PointerEvent) => {
      updatePointer(event);
      mouseRef.current.isDown = true;
      ripples.current.push({ x: mouseRef.current.x, y: mouseRef.current.y, time: Date.now(), intensity: 1.25 });
    };
    const releasePointer = () => {
      mouseRef.current.isDown = false;
    };

    resizeCanvas();
    animateRef.current();
    const observer = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    canvas.addEventListener("pointermove", updatePointer);
    canvas.addEventListener("pointerdown", createRipple);
    window.addEventListener("pointerup", releasePointer);

    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerdown", createRipple);
      window.removeEventListener("pointerup", releasePointer);
      if (animationFrameId.current) window.cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
      timeRef.current = 0;
      ripples.current = [];
    };
  }, [resizeCanvas]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor }}>
      <canvas ref={canvasRef} className="block size-full" aria-hidden="true" />
    </div>
  );
}
