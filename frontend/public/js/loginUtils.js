function getLoginErrorMessage(error) {
  if (error && typeof error.message === 'string' && error.message.trim()) {
    const message = error.message.trim();
    if (/failed to fetch|network|connect/i.test(message)) {
      return 'Unable to connect to the banking API. Start the backend server and try again.';
    }
    return message;
  }

  return 'Unable to sign in right now. Please try again.';
}

if (typeof module !== 'undefined') {
  module.exports = { getLoginErrorMessage };
}

if (typeof window !== 'undefined') {
  window.getLoginErrorMessage = getLoginErrorMessage;
}
