const routes = (handler) => [{
    method: 'POST',
    path: '/collaborations',
    handler: handler.postCollaborationHandler,
    options: {
        auth: 'music_jwt'
    }
},
{
    method: 'DELETE',
    path: '/collaborations',
    handler: handler.deleteCollaborationHandler,
    options: {
        auth: 'music_jwt'
    }
}
];

module.exports = routes;