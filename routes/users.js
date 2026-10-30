var mongoose = require('mongoose');
var User = require('../models/user');

// Export the Mongoose model
module.exports = function (router) {
    var usersRoute = router.route('/users');

    usersRoute.get(
        async function (req, res) {
            // Retreive the users and send a response here.
            try {
                var users = await User.find({});

                res.status(200).json({
                    message: 'Users retrieved successfully',
                    data: users
                });
            } catch (err) {
                console.error('GET /api/users failed:', err.message);
                
                res.status(500).json({
                    message: 'Unable to retrieve users',
                    data: []
                })
            }
        }
    )

    var userRoute = router.route('/users/:id');

    userRoute.get(
        async function (req, res) {
            // Retreive the users and send a response here.
            try {
                var id = req.params.id;

                if (!mongoose.isObjectIdOrHexString(id)) {
                    return res.status(404).json({
                        message: 'User not found',
                        data: {}
                    });
                }

                var select = {};

                if (req.query.select !== undefined) {
                    try {
                        select = JSON.parse(req.query.select);
                    } catch (err) {
                        return res.status(400).json({
                            message: 'select must contain a valid JSON',
                            data: {}
                        });
                    }

                    if (
                        select === null ||
                        typeof select !== 'object' ||
                        Array.isArray(select) ||
                        Object.values(select).some(value => value !== 0 && value !== 1)
                    ) {
                        return res.status(400).json({
                            message: 'select must be an object with value of 0 or 1',
                            data: {}
                        });
                    }

                    var fields = Object.entries(select).filter(([field]) => field !== '_id');

                    if (
                        fields.some(([, value]) => value === 0) &&
                        fields.some(([, value]) => value === 1)
                    ) {
                        return res.status(400).json({
                            message: 'select cannot mix included and excluded fields except for _id',
                            data: {}
                        });
                    }
                }

                var user = await User.findById(id).select(select);

                if (!user) {
                    return res.status(404).json({
                        message: 'User not found',
                        data: {}
                    });
                }

                res.status(200).json({
                    message: 'User retrieved successfully',
                    data: user
                });
            } catch (err) {
                console.error('GET /api/users/:id failed:', err.message);
                
                res.status(500).json({
                    message: 'Unable to retrieve user',
                    data: {}
                })
            }
        }
    )

    return router;
}
