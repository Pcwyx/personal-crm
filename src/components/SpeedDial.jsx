import { useState, useEffect, useRef } from "react";

export default function SpeedDial({ onAddContact, onLogActivity }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function handle(fn) {
    setOpen(false);
    fn();
  }

  return (
    <div className="speed-dial" ref={ref}>
      {open && (
        <div className="speed-dial-options">
          <div className="speed-dial-option">
            <span className="speed-dial-label">Log Activity</span>
            <button className="speed-dial-sub" onClick={() => handle(onLogActivity)}>✍️</button>
          </div>
          <div className="speed-dial-option">
            <span className="speed-dial-label">Add Contact</span>
            <button className="speed-dial-sub" onClick={() => handle(onAddContact)}>👤</button>
          </div>
        </div>
      )}
      <button className={`speed-dial-main${open ? " open" : ""}`} onClick={() => setOpen(v => !v)}>
        +
      </button>
    </div>
  );
}
