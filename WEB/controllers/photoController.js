var photoModel = require('../models/photoModel.js');

/**
 * photoController.js
 *
 * @description :: Server-side logic for managing photos.
 */
module.exports = {

    /**
     * photoController.list()
     */
    list: function (req, res) {
        photoModel.find(function (err, photos) {
            if (err) {
				console.log(err);
				return;
            }
            //return res.json(photos);
			console.log("found");
            return res.render('photo/list',photos);
        });
    },

    /**
     * photoController.show()
     */
    show: function (req, res) {
        var id = req.params.id;
        photoModel.findOne({_id: id}, function (err, photo) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting console info.',
                    error: err
                });
            }
            if (!photo) {
                return res.status(404).json({
                    message: 'No such console info'
                });
            }
            return res.json(photo);
        });
    },

    /**
     * photoController.create()
     */
    dodaj: function (req, res) {

         res.render('photo/dodaj');
    },

    create: function (req, res) {
        var photo = new photoModel({
			content : req.body.content,
        });

        photo.save(function (err, photo) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating photo',
                    error: err
                });
            }
            return res.status(201).json(photo);
        });
    },

    /**
     * photoController.update()
     */
    update: function (req, res) {
        var id = req.params.id;
        photoModel.findOne({_id: id}, function (err, photo) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting photo',
                    error: err
                });
            }
            if (!photo) {
                return res.status(404).json({
                    message: 'No such photo'
                });
            }

            photo.content = req.body.name ? req.body.name : photo.name;
			
            photo.save(function (err, photo) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating Console.',
                        error: err
                    });
                }

                return res.json(photo);
            });
        });
    },

    /**
     * photoController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;
        photoModel.findByIdAndRemove(id, function (err, photo) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting console content.',
                    error: err
                });
            }
            return res.status(204).json();
        });
    }
};
