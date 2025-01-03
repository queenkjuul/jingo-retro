var cryptoz = require('crypto')

var tools = {
  isAuthorized: function (email, pattern, emptyEmailMatches) {
    // Special case where the email is not returned by the backend authorization system
    if (email === 'jingouser') {
      return !!emptyEmailMatches
    }

    if (!email || !email.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b/i)) {
      return false
    }

    if (!pattern || pattern.trim() === '') {
      return true
    }

    var tests = pattern.split(',').map(function (str) {
      return str.trim()
    })
    var expr
    for (var i = 0; i < tests.length; i++) {
      try {
        expr = expr || !!email.match(new RegExp('^' + tests[i] + '$', 'i'))
      } catch (e) {
        // Invalid regular expression
        return false
      }
    }

    return expr
  },

  hashify: function (str) {
    var shasum = cryptoz.createHash('sha1')
    shasum.update(str)
    return shasum.digest('hex')
  },

  isRetroUserAgent: function (ua) {
    // Site works on IE4 / Netscape 3 and above as long as JS is disabled
    // Might need to do some testing with IE8 / old Safari / iCab
    const retroUaStrings = ['Mozilla/3', 'MSIE 3', 'MSIE 4']

    var retro = false

    retroUaStrings.forEach((string) => {
      if (ua.includes(string)) {
        retro = true
      }
    })

    return retro
  },
}

module.exports = tools
