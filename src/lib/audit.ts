'use client';

import { addDoc, collection, serverTimestamp, Firestore } from 'firebase/firestore';

/**
 * Logs an audit trail event to the 'audit_logs' collection.
 * This function does not block and handles its own errors.
 *
 * @param firestore The Firestore instance.
 * @param userName The name of the user performing the action.
 * @param action A short description of the action type (e.g., 'Visitor Check-In').
 * @param details A detailed description of what occurred.
 */
export const logAuditAction = (
  firestore: Firestore,
  userName: string,
  action: string,
  details: string
) => {
  if (!firestore || !userName) {
    console.error('Audit log failed: Firestore instance or user name is missing.');
    return;
  }
  
  try {
    const auditLogsCollection = collection(firestore, 'audit_logs');
    // Non-blocking write
    addDoc(auditLogsCollection, {
      userName,
      action,
      details,
      timestamp: serverTimestamp(),
    }).catch(error => {
      console.error('Error writing to audit log:', error);
    });
  } catch (error) {
    // This would catch synchronous errors, e.g., if firestore is not valid
    console.error('Error preparing audit log:', error);
  }
};
