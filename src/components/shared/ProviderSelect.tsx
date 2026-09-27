import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useModelEndpoints } from '@/hooks/useOpenRouterData'
import { formatPricePerMillion } from '@/lib/openrouter'

const AUTO = '__auto__'

interface ProviderSelectProps {
  modelId: string | null
  value: string | null
  onChange: (providerTag: string | null) => void
  className?: string
}

export function ProviderSelect({ modelId, value, onChange, className }: ProviderSelectProps) {
  const { endpoints, loading, error, retry } = useModelEndpoints(modelId)

  return (
    <div className="space-y-1">
      <Select
        value={value ?? AUTO}
        onValueChange={(v) => onChange(v === AUTO ? null : v)}
        disabled={!modelId}
      >
        <SelectTrigger className={className ?? 'w-full'}>
          <SelectValue placeholder={loading ? 'Loading providers…' : 'Provider'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUTO}>Auto (let OpenRouter choose)</SelectItem>
          {endpoints.map((endpoint) => (
            <SelectItem key={endpoint.tag} value={endpoint.tag}>
              {endpoint.providerName} · {formatPricePerMillion(endpoint.pricing.prompt)}/
              {formatPricePerMillion(endpoint.pricing.completion)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          Couldn't load providers: {error}
          <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs" onClick={retry}>
            Retry
          </Button>
        </p>
      )}
      {!loading && !error && modelId && endpoints.length === 0 && (
        <p className="text-xs text-muted-foreground">This model has no alternate providers.</p>
      )}
    </div>
  )
}
