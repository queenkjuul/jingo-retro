var Promiserr = require('bluebird')
var path = require('path')
var namer = require('../namer')
var fs = require('fs')
var Configurable = require('../configurable')
var locker = require('../locker')
const WikiObject = require('./WikiObject')

var gitmech

var Configuration = function () {
  Configurable.call(this)
}

Configuration.prototype = Object.create(Configurable.prototype)

var configuration = new Configuration() // eslint-disable-line no-unused-vars

class Page extends WikiObject {
  constructor(name, revision, proxyPath) {
    name = name || ''
    super(name, revision, gitmech)
    this.setNames(name)
    this.fetchContent.bind(this)
    this.configOverride({ application: { proxyPath } })
  }

  setNames(name) {
    this.name = namer.unwikify(name.replace(/\.md$/, ''))
    this.wikiname = namer.wikify(this.name)
    this.filename = this.wikiname + '.md'
    this.pathname = gitmech.absPath(this.filename)
    this.uriname = encodeURIComponent(this.wikiname)
  }

  remove() {
    return super.remove()
  }

  renameTo(newName) {
    return super.renameTo(newName + '.md')
  }

  save(message) {
    message = message || ''

    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }

      var defMessage =
        (this.exists() ? 'Content updated' : 'Page created') + ' (' + this.wikiname + ')'

      message = message.trim() === '' ? defMessage : message.trim()

      var content = this.content

      if (this.getConfig().pages.title.fromContent) {
        content = '# ' + this.title + '\n' + content
      }

      content = content.replace(/\r\n/gm, '\n')

      fs.writeFile(this.pathname, content, (err) => {
        if (err) {
          reject(err)
          return
        }

        gitmech.add(this.filename, message, this.author, (err) => {
          if (err) {
            reject(err)
            return
          }

          resolve(content)
        })
      })
    })
  }

  fetchContent() {
    return new Promiserr((resolve, reject) => {
      console.log(this.error)
      if (this.error) {
        resolve()
        return
      }

      gitmech.show(this.filename, this.revision, (err, content) => {
        this.lastCommand = 'show'

        content = content || ''

        if (err) {
          this.error = err
        } else {
          this.rawContent = content

          if (content.length === 0 || this.getConfig().pages.title.fromFilename) {
            this.title = this.name
            this.content = content
          } else {
            // Retrieves the title from the first line of the content (and removes it from the actual content)
            // By default Jingo (< 1.0) stores the title as the first line of the
            // document, prefixed by a '#'
            var lines = content.split('\n')
            this.title = lines[0].trim()

            if (this.title.charAt(0) === '#') {
              this.title = this.title.substr(1).trim()
              this.content = lines.slice(1).join('\n')
            } else {
              // Mmmmh... this file doesn't seem to follow Jingo's convention...
              this.title = this.name
              this.content = content
            }
          }
        }

        resolve()
      })
    })
  }

  lock(user) {
    var lock = locker.getLock(this.name)

    if (lock && lock.user.asGitAuthor !== user.asGitAuthor) {
      this.lockedBy = lock.user
      return false
    }

    locker.lock(this.name, user)
    this.lockedBy = user
    return true
  }

  unlock(user) {
    this.lockedBy = null
    locker.unlock(this.name)
  }

  urlFor(action) {
    const uriname = this.uriname
    const proxyPath = this.getProxyPath() || ''
    console.log(proxyPath, this.getProxyPath(), this.proxyPath)

    var url = ''

    switch (true) {
      case action === 'show':
        url = '/wiki/' + uriname
        break

      case action === 'edit':
        url = '/pages/' + uriname + '/edit'
        break

      case action === 'edit error':
        url = '/pages/' + uriname + '/edit?e=1'
        break

      case action === 'edit put':
        url = '/pages/' + uriname
        break

      case action === 'revert':
        url = '/pages/' + uriname + '/revert'
        break

      case action === 'history':
        url = '/wiki/' + uriname + '/history'
        break

      case action === 'compare':
        url = '/wiki/' + uriname + '/compare'
        break

      case action === 'new':
        url = '/pages/new/' + uriname
        break

      case action === 'new error':
        url = '/pages/new/' + uriname + '?e=1'
        break

      default:
        url = '/'
        break
    }

    return proxyPath + url
  }

  urlForShow() {
    return this.urlFor('show')
  }

  urlForEdit() {
    return this.urlFor('edit')
  }

  urlForEditWithError() {
    return this.urlFor('edit error')
  }

  urlForNewWithError() {
    return this.urlFor('new error')
  }

  urlForEditPut() {
    return this.urlFor('edit put')
  }

  urlForRevert() {
    return this.urlFor('revert')
  }

  urlForHistory() {
    return this.urlFor('history')
  }

  urlForCompare() {
    return this.urlFor('compare')
  }

  isIndex() {
    return this.getConfig().pages.index === this.name
  }

  isFooter() {
    return this.name === '_footer'
  }

  isSidebar() {
    return this.name === '_sidebar'
  }
}

class Pages extends Configurable {
  constructor() {
    super()
    this.models = []
    this.total = 0
  }

  fetch(pagen) {
    return new Promiserr((resolve, reject) => {
      gitmech.ls('*.md', (err, list) => {
        var model
        var Promisers = []

        if (err) {
          reject(err)
          return
        }

        var itemsPerPage = this.getConfig().pages.itemsPerPage

        this.total = list.length
        this.totalPages = Math.ceil(this.total / itemsPerPage)

        if (pagen <= 0) {
          pagen = 1
        }
        if (pagen > this.totalPages) {
          pagen = this.totalPages
        }

        this.currentPage = pagen

        // Read the stats from the fs to be able to sort the whole
        // list before slicing the page out
        var listWithData = list.map((page) => {
          var stats

          try {
            stats = fs.statSync(gitmech.absPath(page))
          } catch (e) {
            stats = null
          }
          return {
            name: page,
            stats: stats,
          }
        })

        listWithData.sort((a, b) => {
          return a.stats !== null && b.stats !== null
            ? b.stats.mtime.getTime() - a.stats.mtime.getTime()
            : 0
        })

        var offset = (pagen - 1) * itemsPerPage
        var slice = listWithData.slice(offset, offset + itemsPerPage)

        slice.forEach((data) => {
          var page = path.basename(data.name).replace(/\.md$/, '')
          model = new Page(page)
          this.models.push(model)
          Promisers.push(model.fetch(true))
        })

        Promiserr.all(Promisers).then(resolve)
      })
    })
  }
}

class File extends WikiObject {
  constructor(name, path, revision) {
    super(name, revision, gitmech)
    this.rawName = name || ''
    this.rawPath = path || ''
    this.type = 'File'
    this.uriname = encodeURIComponent(this.rawName)
    this.pathname = gitmech.absPath('files' + this.rawPath + '/' + this.rawName)
  }

  save(file) {
    return new Promiserr(async (resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }

      this.mimetype = file.mimetype
      this.md5 = file.md5

      var message = JSON.stringify({
        name: this.rawName,
        mimetype: this.mimetype,
        md5: this.md5,
      })

      try {
        await file.mv(this.pathname)
      } catch (err) {
        reject(err)
        return
      }

      gitmech.add(this.pathname, message, this.author, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve(true)
      })
    })
  }

  fetchContent() {
    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }
      // fetches filesystem metadata, the "content" of the file info page
      this.content = fs.statSync(this.pathname)
      resolve()
    })
  }

  remove() {
    return super.remove(this.type)
  }

  urlFor(action) {
    const wname = this.wikiname
    const proxyPath = this.getProxyPath() || ''

    var url = ''

    switch (true) {
      case action === 'show':
        url = '/wiki/' + wname
        break
      case action === 'download':
        url = '/files/' + this.name
        break
    }

    return proxyPath + url
  }

  urlForShow() {
    return this.urlFor('show')
  }
}

var models = {
  Page: Page,

  Pages: Pages,

  File: File,

  use: function (git) {
    gitmech = git
  },

  repositories: {
    refresh: function (callback) {
      gitmech.pull(function (err) {
        callback(err)
      })
    },
  },

  pages: {
    findString: function (string, callback) {
      gitmech.grep(string, function (err, items) {
        callback(err, items)
      })
    },
  },
}

Promiserr.promisifyAll(models.pages)
Promiserr.promisifyAll(models.repositories)

module.exports = models
