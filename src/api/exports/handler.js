class ExportsHandler {
    constructor(service, validator, playlistsService) {
        this._service = service;
        this._validator = validator;
        this._playlistsService = playlistsService;

        this.postExportPlaylistsHandler = this.postExportPlaylistsHandler.bind(this);
    }

    async postExportPlaylistsHandler(request, h) {
        this._validator.validateExportNotesPayload(request.payload);
        const { playlistId } = request.params;
        const userId = request.auth.credentials.id;

        await this._playlistsService.verifyPlaylistAccess(playlistId, userId);

        const { targetEmail } = request.payload;
        const message = { playlistId, targetEmail };

        await this._service.sendMessage('export:playlists', JSON.stringify(message));

        const response = h.response({
            status: 'success',
            message: 'Permintaan Anda dalam antrean',
        });
        response.code(201);
        return response;
    }
}

module.exports = ExportsHandler;