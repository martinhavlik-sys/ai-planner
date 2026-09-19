"use client";
import { useEffect, useId, useState } from "react";
export default function RecordPicker({ label, records, value, onChange }: { label: string; records: { id: number; name: string }[]; value: number | null; onChange: (id: number | null) => void }) {
  const id = useId();
  const selected = records.find(r => r.id === value)?.name ?? "";
  const [text, setText] = useState(selected);
  useEffect(() => setText(selected), [selected, value]);
  return <label>{label}<input list={id} value={text} placeholder={`Bez ${label.toLocaleLowerCase("sk")}`} onChange={e => {
    const name = e.target.value; setText(name);
    const match = records.find(r => r.name.toLocaleLowerCase("sk") === name.toLocaleLowerCase("sk"));
    if (match || !name) onChange(match?.id ?? null);
    e.target.setCustomValidity(name && !match ? "Vyberte existujúci záznam zo zoznamu alebo pole vyprázdnite." : "");
  }} onBlur={e => { if (!records.some(r => r.name === text)) { setText(selected); e.target.setCustomValidity(""); } }} /><datalist id={id}>{records.map(r => <option key={r.id} value={r.name} />)}</datalist></label>;
}
