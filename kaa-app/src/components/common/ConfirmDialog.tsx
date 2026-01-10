/**
 * Confirm Dialog Component
 * Reusable confirmation dialog with customizable actions.
 */

import { useState } from 'react';
import { Modal } from './Modal';
import './ConfirmDialog.css';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading: externalLoading,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading ?? internalLoading;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setInternalLoading(false);
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnOverlay={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className={`confirm-dialog confirm-dialog--${variant}`}>
        <div className="confirm-dialog__icon">{getIcon()}</div>
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__message">{message}</p>

        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__button confirm-dialog__button--cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-dialog__button confirm-dialog__button--confirm confirm-dialog__button--${variant}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="confirm-dialog__spinner" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
