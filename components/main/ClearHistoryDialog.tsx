// components/main/ClearHistoryDialog.tsx
//
// The confirmation for wiping local history. It lives in its own module so the dialog
// machinery it needs is downloaded the first time someone asks to clear history, and
// not by every visitor on first load.
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ClearHistoryDialog({
  count,
  onConfirm,
  onClose,
  returnFocusTo,
}: {
  count: number;
  onConfirm: () => void;
  onClose: () => void;
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          // The button that opened this is outside the dialog tree, so hand focus back to it by hand.
          event.preventDefault();
          returnFocusTo.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all local race records?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes all {count} {count === 1 ? 'record' : 'records'} saved in this browser. They&apos;re only
            stored locally, so you can&apos;t get them back. Export anything you want to keep first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep them</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Clear history</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
