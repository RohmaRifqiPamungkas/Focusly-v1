import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border border-border text-foreground',
        success: 'bg-success/10 text-success',
        warning: 'bg-yellow-500/10 text-yellow-500',
        critical: 'bg-red-600/15 text-red-500 border border-red-500/20',
        high: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
        medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
        low: 'bg-green-500/10 text-green-400 border border-green-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
