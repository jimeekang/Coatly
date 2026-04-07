'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface SignaturePadProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

type Tab = 'draw' | 'upload';

export function SignaturePad({ value, onChange, disabled }: SignaturePadProps) {
  const [tab, setTab] = useState<Tab>('draw');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'draw' && value?.startsWith('data:image') && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          ctx.drawImage(img, 0, 0);
          setHasDrawing(true);
        }
      };
      img.src = value;
    }
  }, [tab, value]);

  const getPoint = (e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((x: number, y: number) => {
    if (disabled) return;
    isDrawing.current = true;
    lastPoint.current = { x, y };
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1c19';
      ctx.fill();
    }
  }, [disabled]);

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPoint.current) return;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1c1c19';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPoint.current = { x, y };
    setHasDrawing(true);
  }, [disabled]);

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  }, [onChange]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const p = getPoint(e.nativeEvent, canvasRef.current);
    startDraw(p.x, p.y);
  }, [startDraw]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const p = getPoint(e.nativeEvent, canvasRef.current);
    draw(p.x, p.y);
  }, [draw]);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const p = getPoint(e.touches[0], canvasRef.current);
    startDraw(p.x, p.y);
  }, [startDraw]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const p = getPoint(e.touches[0], canvasRef.current);
    draw(p.x, p.y);
  }, [draw]);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setHasDrawing(false);
    onChange(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setUploadPreview(result);
      onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    onChange(null);
    setUploadPreview(null);
    setHasDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-pm-border bg-pm-surface p-1">
        {(['draw', 'upload'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            disabled={disabled}
            onClick={() => switchTab(t)}
            className={[
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              tab === t
                ? 'bg-white text-pm-body shadow-sm'
                : 'text-pm-secondary hover:text-pm-body',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            ].join(' ')}
          >
            {t === 'draw' ? '✏️ Draw' : '📎 Upload'}
          </button>
        ))}
      </div>

      {/* Draw tab */}
      {tab === 'draw' && (
        <div className="space-y-2">
          <div
            className={[
              'relative overflow-hidden rounded-xl border-2 bg-white transition-colors',
              disabled
                ? 'border-pm-border opacity-60'
                : hasDrawing
                ? 'border-pm-teal-mid'
                : 'border-dashed border-pm-border hover:border-pm-teal-mid/60',
            ].join(' ')}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className={[
                'w-full touch-none',
                disabled ? 'cursor-not-allowed' : 'cursor-crosshair',
              ].join(' ')}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={endDraw}
            />
            {!hasDrawing && !disabled && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                <svg className="h-6 w-6 text-pm-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
                <p className="text-sm text-pm-secondary">Sign here with your finger or mouse</p>
              </div>
            )}
          </div>
          {hasDrawing && !disabled && (
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1.5 text-sm text-pm-secondary hover:text-pm-body"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Clear and redraw
            </button>
          )}
        </div>
      )}

      {/* Upload tab */}
      {tab === 'upload' && (
        <div className="space-y-2">
          {uploadPreview ? (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-xl border border-pm-border bg-pm-surface p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadPreview} alt="Signature preview" className="max-h-28 w-full object-contain" />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => { setUploadPreview(null); onChange(null); }}
                  className="flex items-center gap-1.5 text-sm text-pm-secondary hover:text-pm-body"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Remove and re-upload
                </button>
              )}
            </div>
          ) : (
            <label
              className={[
                'flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-pm-border bg-pm-surface transition-colors',
                disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-pm-teal-mid hover:bg-pm-teal-light',
              ].join(' ')}
            >
              <svg className="h-8 w-8 text-pm-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm font-medium text-pm-secondary">Click to upload signature</span>
              <span className="text-xs text-pm-secondary">PNG, JPG, GIF</span>
              <input type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={handleFileUpload} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
