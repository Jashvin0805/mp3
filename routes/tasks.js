var mongoose = require('mongoose');
var Task = require('../models/task');

// Export the Mongoose model
module.exports = function (router) {
    var tasksRoute = router.route('/tasks');

    tasksRoute.get(
        async function (req, res) {
            // Retreive the tasks and send a response here.
            try {
                var tasks = await Task.find({}).limit(100);

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

    var taskRoute = router.route('/tasks/:id');

    taskRoute.get(
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

    return router;
}
