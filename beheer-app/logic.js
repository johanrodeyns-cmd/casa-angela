const VERSION = '0.1.0';

function getVersion() {
  return VERSION;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getVersion };
}
