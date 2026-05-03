"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const MAX_REASON = 2000

type OrderCancelDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: (reason: string) => Promise<void>
}

export function OrderCancelDialog({
  open,
  onOpenChange,
  title = "Cancel order",
  description = "Please give a short reason. This is stored on the order.",
  confirmLabel = "Confirm cancellation",
  busy = false,
  onConfirm,
}: OrderCancelDialogProps) {
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) setReason("")
  }, [open])

  const trimmed = reason.trim()
  const canSubmit = trimmed.length > 0 && !busy

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Reason for cancellation</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
            placeholder="Required"
            className="min-h-[100px] rounded-xl resize-y"
            disabled={busy}
            maxLength={MAX_REASON}
          />
          <p className="text-xs text-muted-foreground text-right">{trimmed.length} / {MAX_REASON}</p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="rounded-lg" disabled={busy} onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-lg"
            disabled={!canSubmit}
            onClick={() => {
              void (async () => {
                if (!canSubmit || busy) return
                try {
                  await onConfirm(trimmed)
                  onOpenChange(false)
                } catch {
                  /* parent handles error; keep dialog open */
                }
              })()
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
