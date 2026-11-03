var mongoose = require('mongoose');
var Task = require('../models/task');

// Export the Mongoose model
module.exports = function (router) {
    var User = require('../models/user');

    // Tasks Route
    var tasksRoute = router.route('/tasks');

    // Tasks Route POST
    tasksRoute.post(
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
                
                // Validate Name
                if (typeof body.name !== 'string' || body.name.trim() === '') {
                    return res.status(400).json({
                        message: 'Name must be a non-empty string',
                        data: {}
                    });
                }

                // Validate Deadline
                if (
                    typeof body.deadline !== 'string' || body.deadline.trim() === '' ||
                    Number.isNaN(new Date(body.deadline).getTime())
                ) {
                    return res.status(400).json({
                        message: 'Deadline must be a valid data string',
                        data: {}
                    });
                }

                var deadline = new Date(body.deadline);

                // Validate other variables from task.js
                if (
                    (body.deadline !== undefined && typeof body.deadline !== 'string') ||
                    (body.description !== undefined && typeof body.description !== 'string') ||
                    (body.completed !== undefined && typeof body.completed !== 'boolean') ||
                    (body.assignedUser !== undefined && typeof body.assignedUser !== 'string') ||
                    (body.assignedUserName !== undefined && typeof body.assignedUserName !== 'string')
                ) {
                    return res.status(400).json({
                        message: 'Task fields have invalid data-types',
                        data: {}
                    })
                }

                var description = body.description === undefined ? '' : body.description;
                var completed = body.completed === undefined ? false : body.completed;
                var assignedUser = body.assignedUser === undefined ? '' : body.assignedUser;

                // Validate assignedUser
                if (assignedUser !== '' || !mongoose.isObjectIdOrHexString(assignedUser)) {
                    return res.status(400).json({
                        message: 'assignedUser must be a valid user ID or an empty string',
                        data: {}
                    })
                }

                var saveTask = mongoose.connection.transaction(
                    async function(session) {
                        var assignedUserName = 'unassigned';
                        var user = null;

                        if (assignedUser !== '') {
                            user = await User.findById(assignedUser).session(session);

                            if (!user) {
                                var emailError = new Error('Assigned user not found');
                                emailError.status = 400;
                                throw emailError;
                            }
                            
                            if (
                                body.assignedUserName !== undefined &&
                                body.assignedUserName !== user.name
                            ) {
                                var nameError = new Error('assignedUserName must match the assigned user');
                                nameError.status = 400;
                                throw nameError;
                            }

                            assignedUserName = user.name;
                        }

                        var newTask = new Task({
                            name: body.name,
                            deadline: deadline,
                            description: description,
                            completed: completed,
                            assignedUser: user ? user._id.toString() : '',
                            assignedUserName: assignedUserName,
                        })

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
                    message: 'Task created successfully',
                    data: saveTask
                });
            } catch (err) {
                console.error('POST /api/tasks failed:', err.message);

                return res.status(500).json({
                    message: 'Unable to create task',
                    data: {}
                })
            }
        }
    );

    // Tasks Route GET
    tasksRoute.get(
        async function (req, res) {
            // Retreive the tasks and send a response here.
            try {
                // Where
                var where = {};

                if (req.query.where !== undefined) {
                    try {
                        where = JSON.parse(req.query.where);
                    } catch (err) {
                        return res.status(400).json({
                            message: 'where must contain a valid JSON',
                            data: {}
                        });
                    }

                    if (where === null || typeof where !== 'object' || Array.isArray(where)) {
                        return res.status(400).json({
                            message: 'where must be a JSON object',
                            data: {}
                        });
                    }
                }

                // Sort

                // Tasks
                var tasks = await Task.find(where).limit(100);

                res.status(200).json({
                    message: 'Tasks retrieved successfully',
                    data: tasks
                });
            } catch (err) {
                console.error('GET /api/tasks failed:', err.message);
                
                res.status(500).json({
                    message: 'Unable to retrieve tasks',
                    data: []
                })
            }
        }
    )

    // ----------------------------------

    // Task ID Route
    var taskIdRoute = router.route('/tasks/:id');

    // Task ID Route GET
    taskIdRoute.get(
        async function (req, res) {
            // Retreive the tasks and send a response here.
            try {
                var id = req.params.id;

                if (!mongoose.isObjectIdOrHexString(id)) {
                    return res.status(404).json({
                        message: 'Task not found',
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

                var task = await Task.findById(id).select(select);

                if (!task) {
                    return res.status(404).json({
                        message: 'Task not found',
                        data: {}
                    });
                }

                res.status(200).json({
                    message: 'Task retrieved successfully',
                    data: task
                });
            } catch (err) {
                console.error('GET /api/tasks/:id failed:', err.message);
                
                res.status(500).json({
                    message: 'Unable to retrieve task',
                    data: {}
                })
            }
        }
    )

    // Task ID Route PUT
    // taskIdRoute.put();

    // Task ID Route DELETE
    taskIdRoute.delete(async function(req, res) {
        var id = req.params.id;

        if (!mongoose.isObjectIdOrHexString(id)) {
            return res.status(404).json({
                message: 'Task not found',
                data: {}
            })
        }

        try {
            var deleteTask = await mongoose.connection.transaction(
                async function (session) {
                    var task = await Task.findByIdAndDelete(id, {
                        session: session
                    })

                    if (!task) {
                        return null;
                    }

                    await User.updateMany(
                        { pendingTasks: task._id.toString() },
                        { $pull: { pendingTasks: task._id.toString() } },
                        { session: session }
                    );

                    return task;
                }
            );

            if (!deleteTask) {
                return res.status(404).json({
                    message: 'Task not found',
                    data: {}
                })
            }

            return res.status(200).json({
                message: 'Task deleted successfully',
                data: deleteTask
            })
        } catch (err) {
            console.error('DELETE /api/tasks/:id failed:', err.message);

            return res.status(500).json({
                message: 'Unable to delete task',
                data: {}
            })
        }
    });

    return router;
}
