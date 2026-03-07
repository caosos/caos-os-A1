import React from 'react';
import ExecutionReceipt from '../ExecutionReceipt';

// Verbatim extraction of execution receipt + debug suppressed-log blocks — Commit 8
// console.log preserved exactly as-is (removal deferred to PR2)

export default function ReceiptPanel({ isUser, message, showExecution }) {
  return (
    <>
      {/* Execution Receipt - ALWAYS show when execution_receipt exists AND toggle is ON */}
      {!isUser && message.execution_receipt && showExecution && (
        <ExecutionReceipt receipt={message.execution_receipt} />
      )}

      {/* DEBUG: Log if receipt exists but not shown */}
      {!isUser && message.execution_receipt && !showExecution && (
        <div className="hidden">
          {console.log('🔍 [RECEIPT_SUPPRESSED]', {
            message_id: message.id,
            has_receipt: !!message.execution_receipt,
            showExecution,
            receipt_keys: Object.keys(message.execution_receipt)
          })}
        </div>
      )}
    </>
  );
}