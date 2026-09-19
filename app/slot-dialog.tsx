"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarSlot, timeLabel } from "./model";

export default function SlotDialog({ slot, taskName, onClose, onConfirm }: {
  slot: CalendarSlot; taskName: string; onClose: () => void;
  onConfirm: (timing: Pick<CalendarSlot, "day" | "startHour" | "duration">) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [other, setOther] = useState(false);
  const [day, setDay] = useState(slot.day);
  const [time, setTime] = useState(timeLabel(slot.startHour));
  const [duration, setDuration] = useState(slot.duration);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => previous?.focus(); }, []);
  return <dialog ref={dialog} className="slotDialog" aria-labelledby="slot-title" onCancel={onClose}>
    <div className="modalHeader"><h2 id="slot-title">Ďalší časový blok</h2><button type="button" className="ghost iconButton" aria-label="Zavrieť" title="Zavrieť" onClick={onClose}>×</button></div>
    <p>{taskName}</p>
    {!other ? <div className="slotChoices"><button autoFocus onClick={() => onConfirm(slot)}>Rovnaký čas</button><button className="ghost" onClick={() => setOther(true)}>Iný čas</button></div> : <form onSubmit={event => {
      event.preventDefault(); const [hours, minutes] = time.split(":").map(Number);
      onConfirm({ day, startHour: hours + minutes / 60, duration });
    }}>
      <label>Dátum<input autoFocus type="date" required value={day} onChange={e => setDay(e.target.value)} /></label>
      <label>Čas<input type="time" required step="900" max="23:45" value={time} onChange={e => setTime(e.target.value)} /></label>
      <label>Trvanie (h)<input type="number" required min="0.25" max="24" step="0.25" value={duration} onChange={e => setDuration(e.target.valueAsNumber)} /></label>
      <div className="slotChoices"><button type="submit">Pridať blok</button><button type="button" className="ghost" onClick={() => setOther(false)}>Späť</button></div>
    </form>}
  </dialog>;
}
