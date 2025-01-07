const { marked: Marked } = require('marked')
const cryptoz = require('crypto')
const Nsh = require('node-syntaxhighlighter')
const namer = require('./namer')
const Page = require('./models').Page
const directives = require('./directives')
const Configurable = require('./configurable')
const { gfmHeadingId } = require('marked-gfm-heading-id')
const DOMPurify = require('isomorphic-dompurify')
const escapeMd = require('escape-html')

var Configuration = function () {
  Configurable.call(this)
}

Configuration.prototype = Object.create(Configurable.prototype)

var configuration = new Configuration()

function highlight(code, lang, info) {
  lang = lang || 'text'
  return Nsh.highlight(code, Nsh.getLanguage(lang) || Nsh.getLanguage('text'), {
    gutter: lang !== 'text',
  })
}

function codeRenderer({ text: code, lang, escaped }) {
  var out = highlight(code, lang)
  if (out !== null && out !== code) {
    escaped = true
    code = out
  }

  if (!lang) {
    return '<code class="md-code">' + (escaped ? code : escape(code, true)) + '\n</code>'
  }

  return (
    '<code class="md-code ' +
    escape(lang, true) +
    '">' +
    (escaped ? code : escape(code, true)) +
    '\n</code>\n'
  )
}

Marked.setOptions({
  gfm: true,
  // pedantic: this is set on the render method - must be false now
  // breaks: this is set on the render method
  tables: true,
})
Marked.use({
  extensions: [
    {
      name: 'link',
      renderer({ href, text }) {
        var defaultRender = `<a ${
          href.startsWith('http') ? '' : 'class="internal" '
        }href="${href}">${text}</a>`
        if (href === text && !configuration.getConfig().application.allowHtml) {
          // don't autolink URLs when allowHtml === false
          return href
        }
        return defaultRender
      },
    },
    {
      name: 'code',
      renderer: codeRenderer,
    },
  ],
  hooks: {
    preprocess(markdown) {
      // allowHtml === false => escape HTML before processing Markdown to ensure no user HTML gets rendered
      return configuration.getConfig().application.allowHtml ? markdown : escapeMd(markdown)
    },
    postprocess(html) {
      return DOMPurify.sanitize(html)
    },
  },
})
Marked.use(gfmHeadingId())

var tagmap = {}

// Yields the content with the rendered [[bracket tags]]
// The rules are the same for Gollum https://github.com/github/gollum
function extractTags(text) {
  tagmap = {}

  var matches = text.match(/\[\[(.+?)\]\]/g)
  var tag
  var id

  if (matches) {
    matches.forEach(function (match) {
      match = match.trim()
      tag = /(.?)\[\[(.+?)\]\](.?)/.exec(match)
      if (tag[1] === "'") {
        return
      }
      id = cryptoz.createHash('sha1').update(tag[2]).digest('hex')
      tagmap[id] = tag[2]
      text = text.replace(tag[0], id)
    })
  }

  return text
}

function evalTags(text) {
  var parts, name, url, pageName, re

  for (var k in tagmap) {
    if (tagmap.hasOwnProperty(k)) {
      parts = tagmap[k].split('|')
      name = pageName = parts[0]
      if (parts[1]) {
        pageName = parts[1]
      }
      url = Page.urlFor(namer.wikify(pageName), 'show', configuration.configObject.getProxyPath())

      tagmap[k] = `[${name}](${url})`
    }
  }

  for (k in tagmap) {
    if (tagmap.hasOwnProperty(k)) {
      re = new RegExp(k, 'g')
      text = text.replace(re, tagmap[k])
    }
  }

  return text
}

var directiveMap = directives.directiveMap

function applyDirectives(text) {
  var matches = text.match(/\{\{([^}]*)\}\}/g)

  if (matches) {
    matches.forEach(function (match) {
      var directiveString = /\{\{([^}]*)\}\}/.exec(match)[1]
      var directiveSplit = directiveString.split('\n')
      var directive = directiveSplit[0]
      var args = directiveSplit.slice(1).join('\n')
      if (directive in directiveMap) {
        text = text.replace(match, directiveMap[directive](text, args))
      }
    })
  }
  return text
}

var Renderer = {
  render: function (content) {
    Marked.setOptions({
      breaks: configuration.getConfig().application.gfmBreaks,
    })
    Marked.use(gfmHeadingId())

    var text = extractTags(content)
    text = evalTags(text)
    text = applyDirectives(text)
    return Marked(text)
  },
}

module.exports = Renderer
