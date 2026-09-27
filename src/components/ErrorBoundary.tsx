import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Without this, an uncaught render error unmounts the whole tree and leaves
// a blank white screen — the exact failure mode that's undebuggable on a
// phone with no DevTools access. This at least surfaces what broke.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
            <p className="max-w-sm text-sm text-muted-foreground">{this.state.error.message}</p>
          </div>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      )
    }
    return this.props.children
  }
}
