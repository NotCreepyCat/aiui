import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const SNOOZE_MS = 5 * 60 * 1000

interface DeleteMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (snoozeUntil: number | null) => void
}

export function DeleteMessageDialog({ open, onOpenChange, onConfirm }: DeleteMessageDialogProps) {
  const [snooze, setSnooze] = useState(false)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSnooze(false)
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete message?</AlertDialogTitle>
          <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            id="snooze-delete-confirm"
            checked={snooze}
            onCheckedChange={(checked) => setSnooze(checked === true)}
          />
          <Label htmlFor="snooze-delete-confirm" className="font-normal">
            Don't ask again for 5 minutes
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => onConfirm(snooze ? Date.now() + SNOOZE_MS : null)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
