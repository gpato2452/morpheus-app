const express = require('express')
const db = require('../db')

const router = express.Router()

router.get('/tasks', (req, res) => res.json(db.getTasks()))
router.get('/followups', (req, res) => res.json(db.getFollowups()))

module.exports = router
