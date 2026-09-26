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
  const { endpoints, loading } = useModelEndpoints(modelId)

  return (
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
  )
}
