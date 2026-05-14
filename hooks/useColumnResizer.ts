import { useState, useCallback } from "react";

export function useColumnResizer(initialWidths: Record<string, number> = {}) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);

  const handleResize = useCallback((column: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.pageX;
    const startWidth = columnWidths[column] || 150;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999';
    overlay.style.cursor = 'col-resize';
    document.body.appendChild(overlay);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }));
    };

    const onMouseUp = () => {
      document.body.removeChild(overlay);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  return {
    columnWidths,
    handleResize
  };
}