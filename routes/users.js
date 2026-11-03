var mongoose = require('mongoose');
var User = require('../models/user');
const user = require('../models/user');

// Export the Mongoose model
module.exports = function (router) {
    var Task = require('../models/task');

    // Users Route
    var usersRoute = router.route('/users');

    // Users Route POST
    usersRoute.post(
        async function(req, res) {
            try {
                var body = req.body;

                // Validate Body
                if (!body || typeof body !== 'object' || Array.isArray(body)) {
                    return res.status(400).json({
                        message: 'Request body must be an object',
                        data: {}
                    });
                }

                // Validate Name and Email
                if (
                    typeof body.name !== 'string' || body.name.trim() === '' ||
                    typeof body.email !== 'string' || body.email.trim() === ''
                ) {
                    return res.status(400).json({
                        message: 'Name and Email must be non-empty strings',
                        data: {}
                    });
                }

                // Validate Pending Tasks
                var pendingTasks = body.pendingTasks === undefined ? [] : body.pendingTasks;

                if (
                    !Array.isArray(pendingTasks) ||
                    pendingTasks.some(
                        id => typeof id !== 'string' ||
                        !mongoose.isObjectIdOrHexString(id)
                    )
                ) {
                    return res.status(400).json({
                        message: 'pendingTasks must be an array of valid task IDs',
                        data: {}
                    });
                }

                // Validate if User Email ID already exists
                pendingTasks = [...new Set(pendingTasks.map(id => id.toLowerCase()))];

                await User.init();

                // Creating and saving a User's information in MongoDB
                var saveUser = await mongoose.connection.transaction(
                    async function(session) {
                        var existUser = await User.findOne({
                            email: body.email
                        }).session(session);
        
                        if (existUser) {
                            var emailError = new Error('Email is already in use');
                            emailError.status = 400;
                            throw emailError;
                        }

                        if (
                            body.assignedUser !== undefined &&
                            body.assignedUserName !== user.name
                        ) {
                            var nameError = new Error('assignedUserName must match the assigned user');
                            nameError.status = 400;
                            throw nameError
                        }

                        var newTask = new Task({
                            name: body.name,
                            deadline: deadline,
                            description: description,
                            completed: completed,
                            assignedUser: user ? user._id.toString() : '',
                            assignedUserName: assignedUserName,
                        });

                        await newTask.save({ session: session });

                        if (user && !completed) {
                            await User.updateOne(
                                { _id: user._id },
                                {
                                    $addToSet: {
                                        pendingTasks: newTask._id.toString()
                                    }
                                },
                                { session: session }
                            );
                        }

                        return newTask;
                    }
                );

                return res.status(201).json({
                    message: 'User created successfully',
                    data: saveUser
                });
            } catch (err) {
                if (err.code === 11000) {
                    return res.status(400).json({
                        message: 'Email is already in use',
                        data: {}
                    });
                }

                if (err.status === 400 || err.status === 404) {
                    return res.status(err.status).json({
                        message: err.message,
                        data: {}
                    });
                }

                console.error('POST /api/users failed:', err.message);

                return res.status(500).json({
                    message: 'Unable to create user',
                    data: {}
                })
            }
        }
    );

    // Users Route GET
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
    );

    // ----------------------------------

    // User ID Route
    var userIdRoute = router.route('/users/:id');

    // User ID Route GET
    userIdRoute.get(
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
    );

    // User ID Route PUT
    // userIdRoute.put();

    // User ID Route DELETE
    userIdRoute.delete(
        async function(req, res) {
        var id = req.params.id;

        if (!mongoose.isObjectIdOrHexString(id)) {
            return res.status(404).json({
                message: 'User not found',
                data: {}
            })
        }

        try {
            var deleteUser = await mongoose.connection.transaction(
                async function (session) {
                    var user = await User.findByIdAndDelete(id, {
                        session: session
                    });

                    if (!user) {
                        return null;
                    }

                    await Task.updateMany(
                        { assignedUser: user._id.toString() },
                        { $set: { assignedUser: '', assignedUserName: 'unassigned' } },
                        { session: session }
                    );

                    return user;
                }
            );

            if (!deleteUser) {
                return res.status(404).json({
                    message: 'User not found',
                    data: {}
                })
            }

            return res.status(200).json({
                message: 'User deleted successfully',
                data: deleteUser
            })
        } catch (err) {
            console.error('DELETE /api/users/:id failed:', err.message);

            return res.status(500).json({
                message: 'Unable to delete user',
                data: {}
            })
        }
        }
    );

    return router;
}
