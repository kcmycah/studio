
'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `Firestore permission denied: ${context.operation} at ${context.path}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
