/*
* This is the routes file for the Organizations folder.
* author: ayunus@ucsc.edu mmajidi@ucsc.edu
*/

const router = require('express').Router();
const controller = require('./controller');

router.get('/organization/all', (req, res) => {
	controller.getAllClubs(req, res);
});

router.post('/organization/new', (req, res) => {
	controller.addOrg(req, res);
});

module.exports = router;