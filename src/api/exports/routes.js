const routes = (handler) => [{
    method: 'POST',
    path: '/export/playlists/{playlistId}',
    handler: handler.postExportPlaylistsHandler,
    options: {
        auth: 'music_jwt',
    },
},];

module.exports = routes;