import React from 'react';
import ExecutionReceipt from '../ExecutionReceipt';
import ErrorCard from './ErrorCard';

export default function ReceiptPanel({ isUser, message, showExecution, onRetry }) {
  if (isUser) return null;

  const hasError = message.error_code || message.ok === false || message.mode === 'ERROR';
  const showReceipt = showExecution || hasError;

  return (
    <>
      {hasError && (
        <ErrorCard
          endpoint={message.endpoint || 'hybridMessage'}
          error_code={message.error_code}
          stage={message.stage}
          request_id={message.request_id}
          retryable={message.retryable !== false}
          onRetry={onRetry}
        />
      )}
      {message.execution_receipt && showReceipt && (
        <ExecutionReceipt receipt={message.execution_receipt} forceExpand={hasError} />
      )}
    </>
  );
}