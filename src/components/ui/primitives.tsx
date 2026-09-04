import type { ReactNode } from 'react'

/* ---------------------------------------------------------------------------
 * Small shared UI pieces. Everything reads colour and spacing from the design
 * tokens, so there are no raw hex values below this line.
 * ------------------------------------------------------------------------ */

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'accent'

const TONE_FG: Record<Tone, string> = {
  neutral: 'var(--color-muted-foreground)',
  good: 'var(--color-success)',
  warn: 'var(--color-warning)',
  bad: 'var(--color-destructive)',
  info: 'var(--color-info)',
  accent: 'var(--color-accent)',
}

/**
 * A label with an icon slot. Tone is never the only signal — callers always
 * pass text, and usually an icon too — because colour alone fails for anyone
 * who cannot separate red from green.
 */
export function Badge({
  children,
  tone = 'neutral',
  icon,
  title,
}: {
  children: ReactNode
  tone?: Tone
  icon?: ReactNode
  title?: string
}) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
        color: TONE_FG[tone],
        background: `color-mix(in srgb, ${TONE_FG[tone]} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${TONE_FG[tone]} 32%, transparent)`,
      }}
    >
      {icon}
      {children}
    </span>
  )
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  padded = true,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  padded?: boolean
}) {
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {title ? (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h2>
            {subtitle ? (
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 12.5,
                  color: 'var(--color-muted-foreground)',
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div
        style={{
          padding: padded ? 'var(--spacing-lg)' : 0,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </section>
  )
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  type = 'button',
  full,
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
  full?: boolean
  ariaLabel?: string
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-accent)',
      color: 'var(--color-on-accent)',
      border: '1px solid var(--color-accent)',
    },
    secondary: {
      background: 'var(--color-muted)',
      color: 'var(--color-foreground)',
      border: '1px solid var(--color-border-strong)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-muted-foreground)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'color-mix(in srgb, var(--color-destructive) 18%, transparent)',
      color: 'var(--color-destructive)',
      border: '1px solid color-mix(in srgb, var(--color-destructive) 40%, transparent)',
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        ...styles[variant],
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-body)',
        fontSize: 13.5,
        fontWeight: 600,
        width: full ? '100%' : undefined,
        // 44px minimum touch target on the primary controls.
        minHeight: 40,
        opacity: disabled ? 0.5 : 1,
        transition: 'background var(--dur-hover) var(--ease-out), border-color var(--dur-hover) var(--ease-out)',
      }}
    >
      {children}
    </button>
  )
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: Array<{ id: T; label: string; icon?: ReactNode }>
  active: T
  onChange: (id: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      style={{
        display: 'flex',
        gap: 2,
        padding: 3,
        background: 'var(--color-muted)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        overflowX: 'auto',
      }}
      className="scroll-x"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flex: '1 0 auto',
              justifyContent: 'center',
              padding: '7px 12px',
              minHeight: 36,
              border: 'none',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
              background: isActive ? 'var(--color-card)' : 'transparent',
              color: isActive ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
              boxShadow: isActive ? 'inset 0 0 0 1px var(--color-border-strong)' : undefined,
              transition: 'background var(--dur-hover) var(--ease-out), color var(--dur-hover) var(--ease-out)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/** A labelled key/value row, used all over the coach panels. */
export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 'var(--spacing-md)',
        padding: '6px 0',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 13.5,
      }}
    >
      <span style={{ color: 'var(--color-muted-foreground)' }}>{label}</span>
      <span style={{ textAlign: 'right', fontWeight: 500 }}>{children}</span>
    </div>
  )
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 14,
        lineHeight: 1.62,
        color: 'var(--color-foreground)',
        maxInlineSize: '68ch',
      }}
    >
      {children}
    </div>
  )
}

export function Hint({ children, tone = 'info' }: { children: ReactNode; tone?: Tone }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        background: `color-mix(in srgb, ${TONE_FG[tone]} 10%, transparent)`,
        borderLeft: `3px solid ${TONE_FG[tone]}`,
        fontSize: 13.5,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  )
}

export function SquareChip({ square }: { square: string }) {
  return (
    <code
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        padding: '1px 5px',
        borderRadius: 4,
        background: 'var(--color-muted)',
        border: '1px solid var(--color-border)',
      }}
    >
      {square}
    </code>
  )
}
