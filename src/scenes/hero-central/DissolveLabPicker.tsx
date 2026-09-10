import { DISSOLVE_MODES, dissolveLab, useDissolveLab } from './dissolveLab';

const panel: React.CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: 50,
  background: 'rgba(11, 13, 18, 0.92)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '12px 14px',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 12.5,
  width: 260,
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
};

/**
 * Dev-only picker for the dissolve exploration (see dissolveLab.ts).
 * Rendered by App.tsx only in `import.meta.env.DEV`. Not product UI.
 */
export function DissolveLabPicker() {
  const s = useDissolveLab();
  const current = DISSOLVE_MODES.find((m) => m.id === s.modeId) ?? DISSOLVE_MODES[0];

  return (
    <div style={panel} aria-label="Laboratorio de disolución (dev)">
      <div style={{ fontWeight: 700, marginBottom: 8, letterSpacing: '0.04em', opacity: 0.8 }}>
        DISOLUCIÓN · LAB
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {DISSOLVE_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => dissolveLab.set({ modeId: m.id })}
            style={{
              padding: '7px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.14)',
              background: m.id === s.modeId ? '#5479e1' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p style={{ margin: 0, opacity: 0.7, lineHeight: 1.4 }}>{current.hint}</p>
      <p style={{ margin: '8px 0 0', opacity: 0.55, lineHeight: 1.4 }}>
        Luego las partículas viajan y se rearman como el Nodo en la sección Problema.
      </p>
    </div>
  );
}
