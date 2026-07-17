const VERSION = '0.2.0';

function getVersion() {
  return VERSION;
}

function isAllowedEmail(email, allowedEmails) {
  const normalized = email.toLowerCase();
  return allowedEmails.some((allowed) => allowed.toLowerCase() === normalized);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getVersion, isAllowedEmail };
}
