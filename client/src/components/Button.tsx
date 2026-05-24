import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'preview'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-danger',
  preview: 'btn btn-preview',
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  const classes = [variantClass[variant], className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...props} />
}
