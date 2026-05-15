'use client';

import React, { useEffect, useRef } from 'react';
import { Canvas, PencilBrush } from 'fabric';
import { useViewerStore } from '@/store/viewerStore';

export default function CanvasNotation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDisposed = useRef(false);
  const isUndoOrLoading = useRef(false);

  const { songs, setlistId, isDrawingMode, currentAnnotation, saveAnnotation, clearAnnotation } = useViewerStore();

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || songs.length === 0) return;

    isDisposed.current = false;
    let canvas: Canvas | null = null;

    try {
      canvas = new Canvas(canvasRef.current, {
        isDrawingMode: false,
        width: containerRef.current.clientWidth || 800,
        height: containerRef.current.clientHeight || 600,
      });
    } catch (e) {
      console.error('[CanvasNotation] Failed to init Fabric canvas:', e);
      return;
    }

    // Brush config
    const brush = new PencilBrush(canvas);
    brush.color = '#007AFF';
    brush.width = 2;
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = isDrawingMode;

    fabricRef.current = canvas;

    // Restore persisted annotation
    if (currentAnnotation) {
      try {
        isUndoOrLoading.current = true;
        canvas.loadFromJSON(JSON.parse(currentAnnotation)).then(() => {
          isUndoOrLoading.current = false;
          if (!isDisposed.current) canvas?.renderAll();
        }).catch(() => { isUndoOrLoading.current = false; });
      } catch {
        isUndoOrLoading.current = false;
      }
    }

    // Persist on draw
    const handleSave = () => {
      if (isDisposed.current || isUndoOrLoading.current) return;
      try {
        saveAnnotation(JSON.stringify(canvas!.toJSON()));
      } catch { /* ignore */ }
    };

    canvas.on('path:created', handleSave);
    canvas.on('object:modified', handleSave);
    canvas.on('object:removed', handleSave);

    // Resize observer — keep canvas matching the container
    const container = containerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposed.current || !fabricRef.current) return;
      for (const entry of entries) {
        try {
          fabricRef.current.setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        } catch { /* ignore */ }
      }
    });

    if (container) resizeObserver.observe(container);

    return () => {
      isDisposed.current = true;
      resizeObserver.disconnect();
      try { canvas?.dispose(); } catch { /* already disposed */ }
      fabricRef.current = null;
    };
  }, [setlistId]); // BUG FIX #7: Re-init when the setlist changes (not just song count)

  // Sync drawing mode toggle without reinitializing
  useEffect(() => {
    if (fabricRef.current && !isDisposed.current) {
      fabricRef.current.isDrawingMode = isDrawingMode;
    }
  }, [isDrawingMode]);

  // Handle Undo
  useEffect(() => {
    if (fabricRef.current && !isDisposed.current && !isUndoOrLoading.current) {
      const canvas = fabricRef.current;
      if (!currentAnnotation) {
        if (canvas.getObjects().length > 0) {
          isUndoOrLoading.current = true;
          canvas.clear();
          const brush = new PencilBrush(canvas);
          brush.color = '#007AFF';
          brush.width = 2;
          canvas.freeDrawingBrush = brush;
          canvas.isDrawingMode = isDrawingMode;
          isUndoOrLoading.current = false;
        }
      } else {
        const currentState = JSON.stringify(canvas.toJSON());
        if (currentAnnotation !== currentState) {
          isUndoOrLoading.current = true;
          canvas.loadFromJSON(JSON.parse(currentAnnotation)).then(() => {
            isUndoOrLoading.current = false;
            canvas.renderAll();
          }).catch(() => { isUndoOrLoading.current = false; });
        }
      }
    }
  }, [currentAnnotation, isDrawingMode]);

  if (songs.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full z-40 overflow-hidden"
      style={{ pointerEvents: isDrawingMode ? 'auto' : 'none' }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
