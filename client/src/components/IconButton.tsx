import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonVariant = 'default' | 'ghost' | 'like'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  variant?: IconButtonVariant
  children: ReactNode
}

const variantClass: Record<IconButtonVariant, string> = {
  default: 'icon-button',
  ghost: 'icon-button icon-button-ghost',
  like: 'icon-button icon-button-like',
}

export function IconButton({
  label,
  variant = 'default',
  className,
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  const classes = [variantClass[variant], className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...props}>
      {children}
    </button>
  )
}
