var express = require('express');
var router = express.Router();
var entryController = require('../controllers/entryController.js');

/*
 * GET
 */
router.get('/', entryController.list);
router.get('/listGraph', entryController.listGraph);

/*
 * GET
 */
router.get('/:id', entryController.show);

/*
 * POST
 */
router.post('/', entryController.create);
router.post('/trade', entryController.trade);

/*
 * PUT
 */
router.put('/:id', entryController.update);

/*
 * DELETE
 */
router.delete('/:id', entryController.remove);

module.exports = router;
