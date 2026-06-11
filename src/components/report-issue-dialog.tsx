
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquareWarning } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [issue, setIssue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !issue.trim()) return;

    setSubmitting(true);
    
    const feedbackRef = doc(collection(db, 'feedback'));
    const feedbackData = {
      userId: user.uid,
      email: user.email,
      issue: issue.trim(),
      createdAt: serverTimestamp(),
    };

    // Non-blocking mutation with contextual error handling
    setDoc(feedbackRef, feedbackData)
      .then(() => {
        toast({
          title: 'Feedback Received',
          description: 'Thank you for helping us make DISA Audit more accessible.',
        });
        setIssue('');
        onOpenChange(false);
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: feedbackRef.path,
          operation: 'create',
          requestResourceData: feedbackData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-accent" />
            Report Accessibility Issue
          </DialogTitle>
          <DialogDescription>
            Encountered a blockage or contrast issue? Let us know so we can fix it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issue-description">Describe the issue</Label>
            <Textarea
              id="issue-description"
              placeholder="e.g. The focus ring on the 'Run Audit' button is hard to see..."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="min-h-[120px]"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !issue.trim()}
              className="bg-accent text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
