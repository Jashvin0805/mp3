var User = require('../models/user')

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

    return router;
}
