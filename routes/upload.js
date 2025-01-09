const router = require('express-promise-router')()
const fileUpload = require('express-fileupload')
const models = require('../lib/models/models')
const app = require('../lib/app').getInstance()

const proxyPath = app.locals.config.getProxyPath()
const fileDir = app.locals.config.get('application').repository + '/files'

models.use(Git)

router.use(
  '/upload',
  fileUpload({
    useTempFiles: true,
    createParentPath: true,
    debug: true,
  })
)

router.get('/upload', _getUpload)
router.get('/upload/*', _getUpload)
router.post('/upload*', _postUpload)

function _getUpload(req, res) {
  res.render('upload', {
    path: req.params[0] ? '/' + req.params[0] : undefined,
  })
}

function _postUpload(req, res) {
  var file

  if (req.files) {
    const newFile = req.files.file
    const { name } = newFile
    const path = req.originalUrl.replace('/upload', '')
    file = new models.File(name, path)
    file.author = req.user.asGitAuthor

    res.locals.errors = req.session.errors

    file
      .save(newFile)
      .then((success) => {
        if (success) {
          console.log('upload successful')
          res.redirect(file.urlForShow())
          return
        } else {
          throw new Error('Failed to upload ' + file.rawName)
        }
      })
      .catch((e) => {
        console.log(e)
        res.locals.errors = [{ msg: e }]
        res.render('upload')
      })
  }
}

module.exports = router
