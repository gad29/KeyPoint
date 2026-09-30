'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  clearLabel: string;
  hint: string;
  onChange: (dataUrl: string | null) => void;
}

/** Draw-to-sign canvas. Emits a PNG data URL once the signer lifts the pen, or null when cleared. */
export function SignaturePad({ label, clearLabel, hint, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const inked = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(canvas).color || '#101b33';
  }, []);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    last.current = point(event);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    const next = point(event);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last.current = next;
    if (!inked.current) {
      inked.current = true;
      setHasInk(true);
    }
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (inked.current && canvasRef.current) onChange(canvasRef.current.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    inked.current = false;
    setHasInk(false);
    onChange(null);
  }

  return (
    <div className="signature-field">
      <div className="signature-field-head">
        <span>{label}</span>
        <button type="button" className="text-button" onClick={clear} disabled={!hasInk}>
          {clearLabel}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className={`signature-canvas ${hasInk ? 'has-ink' : ''}`}
        aria-label={label}
        role="img"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
      />
      {!hasInk ? <p className="signature-hint">{hint}</p> : null}
    </div>
  );
}
