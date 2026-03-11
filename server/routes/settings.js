const express = require('express')
const settings = require('../settings')

const router = express.Router()

router.get('/', (req, res) => res.json(settings.get()))
router.post('/', (req, res) => { settings.save(req.body); res.json({ ok: true }) })

module.exports = router
