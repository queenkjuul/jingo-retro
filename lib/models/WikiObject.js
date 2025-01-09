const Promiserr = require('bluebird')
const path = require('path')
const namer = require('../namer')
const fs = require('fs')
const Configurable = require('../configurable')

var gitmech

class WikiObject extends Configurable {
  constructor(name, revision, git) {
    super()
    name = name || ''
    gitmech = git
    this.setNames(name)
    this.revision = revision || 'HEAD'
    this.content = ''
    this.title = ''
    this.metadata = {}
    this.error = ''
    this.author = ''
    this.lockedBy = null
    this.hashes = []
    this.lastCommand = ''
    this.lastCommitMessage = ''
  }

  setNames(name) {
    this.name = namer.unwikify(name)
    this.wikiname = namer.wikify(this.name)
    this.filename = this.wikiname
    this.pathname = gitmech.absPath(this.filename)
    this.uriname = encodeURIComponent(this.wikiname)
  }

  exists() {
    return fs.existsSync(this.pathname)
  }

  renameTo(newName, type = 'Page') {
    var newFilename = newName

    return new Promiserr((resolve, reject) => {
      // Cannot rename if the file already exists
      if (fs.existsSync(gitmech.absPath(newFilename))) {
        reject()
        return
      }

      gitmech.mv(
        this.filename,
        newFilename,
        type + ' renamed (' + this.filename + ' => ' + newFilename + ')',
        this.author,
        (err) => {
          if (err) {
            reject()
          } else {
            this.setNames(newName)
            resolve()
          }
        }
      )
    })
  }

  remove(type = 'Page') {
    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }
      gitmech.rm(this.pathname, type + ' removed (' + this.wikiname + ')', this.author, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  fetch(extended) {
    if (!extended) {
      return Promiserr.all([this.fetchContent(), this.fetchMetadata(), this.fetchHashes(1)])
    } else {
      return Promiserr.all([
        this.fetchContent(),
        this.fetchMetadata(),
        this.fetchHashes(),
        this.fetchLastCommitMessage(),
      ])
    }
  }

  fetchContent() {
    throw new Error('Child classes must implement fetchContent()!')
  }

  fetchMetadata() {
    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }

      gitmech.log(this.pathname, this.revision, (err, metadata) => {
        this.lastCommand = 'log'

        if (err) {
          this.error = err
        } else {
          if (typeof metadata !== 'undefined') {
            this.metadata = metadata
          }
        }

        resolve()
      })
    })
  }

  fetchHashes(howmany) {
    howmany = howmany || 2

    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }

      gitmech.hashes(this.pathname, howmany, (err, hashes) => {
        this.lastCommand = 'hashes'

        if (err) {
          this.error = err
        } else {
          this.hashes = hashes
        }

        resolve()
      })
    })
  }

  fetchLastCommitMessage() {
    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }

      gitmech.lastMessage(this.pathname, 'HEAD', (err, message) => {
        this.lastCommand = 'lastMessage'

        if (err) {
          this.error = err
        } else {
          this.lastCommitMessage = message
        }

        resolve()
      })
    })
  }

  fetchHistory() {
    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }

      gitmech.log(this.pathname, 'HEAD', 30, (err, history) => {
        this.lastCommand = 'log'

        if (err) {
          this.error = err
        }

        resolve(history)
      })
    })
  }

  fetchRevisionsDiff(revisions) {
    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }

      gitmech.diff(this.pathname, revisions, (err, diff) => {
        if (err) {
          this.error = err
        }

        resolve(diff)
      })
    })
  }

  revert() {
    return new Promiserr((resolve, reject) => {
      if (this.error) {
        resolve()
        return
      }

      if (this.revision === 'HEAD') {
        reject()
        return
      }

      gitmech.revert(this.pathname, this.revision, this.author, (err, data) => {
        if (err) {
          this.error = err
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
}

module.exports = WikiObject
