"use client";
import { ReactNode, useEffect, useRef } from "react";

// Native top layer sits above every page stacking context. SlotDialog uses the
// same browser layer. Keep page z-indices small and local to the calendar.
export default function TaskDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const dialog = ref.current;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="taskDialog" aria-labelledby="task-dialog-title" onCancel={e => { e.preventDefault(); onClose(); }}>{children}</dialog>;
}
