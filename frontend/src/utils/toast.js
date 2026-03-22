import { toast } from 'react-toastify'

const defaultOptions = {
  position: 'top-right',
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
}

export const showSuccess = (message, options = {}) => {
  toast.success(message, { ...defaultOptions, ...options })
}

export const showError = (message, options = {}) => {
  toast.error(message, { ...defaultOptions, autoClose: 4500, ...options })
}

export const showWarning = (message, options = {}) => {
  toast.warn(message, { ...defaultOptions, ...options })
}

export const showInfo = (message, options = {}) => {
  toast.info(message, { ...defaultOptions, ...options })
}

/**
 * Extract a user-friendly error message from an axios error or generic error.
 * Enhances common messages with actionable guidance.
 */
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const msg = err?.response?.data?.message || err?.message || fallback

  // Enhance common messages with actionable guidance
  // Note: Be careful not to override specific backend messages
  const exactEnhancements = {
    'Account already exists': 'Account already exists. Please login instead.',
    'User already exists': 'An account with this email already exists. Please login instead.',
    'Email already exists': 'An account with this email already exists. Please login instead.',
    'Invalid credentials': 'Invalid email or password. Please check and try again.',
    'Invalid email or password': 'Invalid email or password. Please check and try again.',
  }

  // Check for exact matches first (case-insensitive)
  const msgLower = msg.toLowerCase()
  for (const [key, enhanced] of Object.entries(exactEnhancements)) {
    if (msgLower === key.toLowerCase()) {
      return enhanced
    }
  }

  // Check for partial matches only for generic messages (not specific backend messages)
  const partialEnhancements = {
    'already exists': 'This account already exists. Please login instead.',
    'jwt expired': 'Your session has expired. Please login again.',
    'token expired': 'Your session has expired. Please login again.',
  }

  for (const [key, enhanced] of Object.entries(partialEnhancements)) {
    if (msgLower.includes(key.toLowerCase())) {
      // Don't enhance if the message is already descriptive (longer than 50 chars)
      if (msg.length > 50) {
        return msg
      }
      return enhanced
    }
  }

  // Return the original backend message as-is
  return msg
}
