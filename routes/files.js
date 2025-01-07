const router = require('express-promise-router')()
const fileUpload = require('express-fileupload')
const models = require('../lib/models/models')
const app = require('../lib/app').getInstance()

models.use(Git)

router.use('/files', fileUpload())

router.get('/files', _getFilesNew)
// router.get('/files/:file', _getFile)
router.post('/files', _postFilesNew)

const proxyPath = app.locals.config.getProxyPath()

function _getFilesNew(req, res) {
  var file

  if (req.files?.file) {
    file = new models.File(req.files.file.name)
    if (file.exists()) {
      res.redirect(file.urlForShow())
    }
  }

  res.render('upload')
}

function _postFilesNew(req, res) {
  var file

  if (req.files) {
    file = new models.File(req.files.file.name)
    console.log(file)
  }

  res.render('upload')
}

module.exports = router
