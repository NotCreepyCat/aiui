import { useMemo, useState } from 'react'
import { ChevronsUpDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useModels } from '@/hooks/useOpenRouterData'
import { recordRecentModel, useSettings } from '@/hooks/useSettings'
import { formatPricePerMillion, type OpenRouterModel } from '@/lib/openrouter'
import { cn } from 'cn'

interface ModelComboboxProps {
  value: string
  onChange: (modelId: string) => void
  className?: string
}

export function ModelCombobox({ value, onChange, className }: ModelComboboxProps) {
  const { models, loading, error } = useModels()
  const settings = useSettings()
  const [open, setOpen] = useState(false)

  const selected = useMemo(() => models.find((m) => m.id === value), [models, value])

  const recentModels = useMemo(() => {
    const ids = settings?.recentModelIds ?? []
    return ids.map((id) => models.find((m) => m.id === id)).filter((m): m is OpenRouterModel => !!m)
  }, [models, settings?.recentModelIds])

  const recentIds = useMemo(() => new Set(recentModels.map((m) => m.id)), [recentModels])
  const restModels = useMemo(() => models.filter((m) => !recentIds.has(m.id)), [models, recentIds])

  function select(modelId: string) {
    onChange(modelId)
    void recordRecentModel(modelId)
    setOpen(false)
  }

  function renderItem(model: OpenRouterModel) {
    return (
      <CommandItem
        key={model.id}
        value={`${model.name} ${model.id}`}
        data-checked={model.id === value}
        onSelect={() => select(model.id)}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{model.name}</span>
          <span className="text-xs text-muted-foreground">
            in {formatPricePerMillion(model.pricing.prompt)} · out {formatPricePerMillion(model.pricing.completion)}
          </span>
        </div>
      </CommandItem>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate text-left">
            {selected ? selected.name : loading ? 'Loading models…' : 'Select a model'}
          </span>
          {loading ? (
            <Loader2 className="ml-2 size-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models…" />
          <CommandList>
            <CommandEmpty>{error ? `Error: ${error}` : 'No models found.'}</CommandEmpty>
            {recentModels.length > 0 && (
              <>
                <CommandGroup heading="Recent">{recentModels.map(renderItem)}</CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup>{restModels.map(renderItem)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
