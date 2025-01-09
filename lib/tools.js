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

  getIconForFilename: function (filename) {
    function path(name) {
      return '/img/' + name + '.png'
    }
    const split = filename.split('.')
    const ext = split[split.length - 1]

    if (false) {
    } else if (['doc', 'txt', 'pdf', 'odt', 'docx', 'rtf', 'md'].includes(ext)) {
      return path('doc')
    } else if (['exe', 'msi', 'appImage', 'com', 'app'].includes(ext)) {
      return path('exe')
    } else if (['gif'].includes(ext)) {
      return path('gif')
    } else if (['iso', 'bin', 'cue', 'mds', 'ccd', 'chd', 'nrg', 'dmg', 'img'].includes(ext)) {
      return path('iso')
    } else if (['jpeg', 'jpg', 'jfif'].includes(ext)) {
      return path('jpg')
    } else if (['png'].includes(ext)) {
      return path('png')
    } else if (['midi', 'mid', 'wav', 'mp3', 'aac', 'pcm', 'sf2', 'aiff', 'aif'].includes(ext)) {
      return path('sound')
    } else if (
      [
        'mp4',
        'avi',
        'wmv',
        '3gp',
        'mkv',
        'm4v',
        'divx',
        'xvid',
        'swf',
        'flv',
        'mpg',
        'mpeg',
        'mp2',
        'ts',
      ].includes(ext)
    ) {
      return path('video')
    } else if (
      ['zip', 'rar', 'cab', '7z', 'sit', 'hqx', 'tar', 'gz', 'bz', 'bz2', 'xz'].includes(ext)
    ) {
      return path('zip')
    } else {
      return path('file')
    }
  },

  formatBytes: function (bytes, decimals = 2) {
    if (!+bytes) return '0 B'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  },
}

module.exports = tools
