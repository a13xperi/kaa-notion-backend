/**
 * Change Password Modal Component
 * Allows users to change their password by entering current and new password.
 */

import { useState } from 'react';
import { changePassword } from '../../api/authApi';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [form, setForm] = useState<FormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!form.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (form.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and a number';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await changePassword(form.currentPassword, form.newPassword);
      onSuccess();
      handleClose();
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to change password',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
    setShowPasswords({ current: false, new: false, confirm: false });
    onClose();
  };

  const handleInputChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (!isOpen) return null;

  return (
    <div className="change-password-modal__overlay" onClick={handleClose}>
      <div className="change-password-modal" onClick={e => e.stopPropagation()}>
        <div className="change-password-modal__header">
          <h2>Change Password</h2>
          <button className="change-password-modal__close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="change-password-modal__form">
          {errors.general && (
            <div className="change-password-modal__error-banner">
              {errors.general}
            </div>
          )}

          <div className="change-password-modal__field">
            <label htmlFor="currentPassword">Current Password</label>
            <div className="change-password-modal__input-wrapper">
              <input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={handleInputChange('currentPassword')}
                placeholder="Enter your current password"
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="change-password-modal__toggle"
                onClick={() => togglePasswordVisibility('current')}
                aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
              >
                {showPasswords.current ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.currentPassword && (
              <span className="change-password-modal__field-error">{errors.currentPassword}</span>
            )}
          </div>

          <div className="change-password-modal__field">
            <label htmlFor="newPassword">New Password</label>
            <div className="change-password-modal__input-wrapper">
              <input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={form.newPassword}
                onChange={handleInputChange('newPassword')}
                placeholder="Enter your new password"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="change-password-modal__toggle"
                onClick={() => togglePasswordVisibility('new')}
                aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
              >
                {showPasswords.new ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.newPassword && (
              <span className="change-password-modal__field-error">{errors.newPassword}</span>
            )}
            <span className="change-password-modal__hint">
              At least 8 characters with uppercase, lowercase, and a number
            </span>
          </div>

          <div className="change-password-modal__field">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="change-password-modal__input-wrapper">
              <input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder="Confirm your new password"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="change-password-modal__toggle"
                onClick={() => togglePasswordVisibility('confirm')}
                aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
              >
                {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="change-password-modal__field-error">{errors.confirmPassword}</span>
            )}
          </div>

          <div className="change-password-modal__actions">
            <button
              type="button"
              className="change-password-modal__btn change-password-modal__btn--cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="change-password-modal__btn change-password-modal__btn--submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
