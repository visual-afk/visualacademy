"use client";

import { useState } from "react";
import type { Faq } from "@/lib/types";

export function AccordionItem({ q, a }: Faq) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`acc-item${open ? " open" : ""}`}>
      <button type="button" className="acc-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {q}
        <span className="plus">+</span>
      </button>
      <div className="acc-body">
        <p>{a}</p>
      </div>
    </div>
  );
}

export default function Accordion({ items }: { items: Faq[] }) {
  return (
    <div className="accordion">
      {items.map((f) => (
        <AccordionItem key={f.q} {...f} />
      ))}
    </div>
  );
}
