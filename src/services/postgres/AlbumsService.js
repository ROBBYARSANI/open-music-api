const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    try {
      const id = `album-${nanoid(16)}`;

      const query = {
        text: 'INSERT INTO albums VALUES($1, $2, $3) RETURNING id',
        values: [id, name, year],
      };

      const result = await this._pool.query(query);

      if (!result.rows[0]?.id) {
        throw new InvariantError('Album gagal ditambahkan');
      }

      return result.rows[0].id;
    } catch (error) {
      throw new InvariantError(error.message);
    }
  }

  async getAlbumById(id) {
    try {
      const queryAlbum = {
        text: 'SELECT * FROM albums WHERE id = $1',
        values: [id],
      };
      const querySong = {
        text: 'SELECT songs.id, songs.title, songs.performer FROM songs INNER JOIN albums ON albums.id=songs."albumId" WHERE albums.id=$1',
        values: [id],
      };

      const albumResult = await this._pool.query(queryAlbum);

      if (!albumResult.rows.length) {
        throw new NotFoundError('Album tidak ditemukan');
      }

      const songsResult = await this._pool.query(querySong);

      return {
        id: albumResult.rows[0].id,
        name: albumResult.rows[0].name,
        year: albumResult.rows[0].year,
        coverUrl: albumResult.rows[0].cover,
        songs: songsResult.rows,
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new InvariantError(error.message);
    }
  }

  async editAlbumById(id, { name, year }) {
    try {
      const query = {
        text: 'UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id',
        values: [name, year, id],
      };

      const result = await this._pool.query(query);

      if (!result.rows.length) {
        throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan');
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new InvariantError(error.message);
    }
  }

  async deleteAlbumById(id) {
    try {
      const query = {
        text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
        values: [id],
      };

      const result = await this._pool.query(query);

      if (!result.rows.length) {
        throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new InvariantError(error.message);
    }
  }

  async postAlbumCoverById(id, cover) {
    const query = {
      text: 'UPDATE albums SET cover = $1 WHERE id = $2',
      values: [cover, id]
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan');
    }
  }
  async postUserAlbumLikeById(userId, albumId) {
    const queryAlbum = {
      text: 'SELECT id FROM albums WHERE id = $1',
      values: [albumId]
    };
    const { rows: resultAlbum } = await this._pool.query(queryAlbum);
    if (!resultAlbum.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    const querySearchLike = {
      text: 'SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId]
    };
    const resultSearchLike = await this._pool.query(querySearchLike);

    if (resultSearchLike.rows.length) {
      throw new InvariantError('Anda sudah menyukai album ini');
    }

    // Tambahkan like
    const id = `like-${nanoid(16)}`;
    const queryLike = {
      text: 'INSERT INTO user_album_likes (id, user_id, album_id) VALUES ($1, $2, $3)',
      values: [id, userId, albumId]
    };
    await this._pool.query(queryLike);

    // Hapus cache
    await this._cacheService.delete(`album-likes:${albumId}`);

    return 'Berhasil menyukai album';
  }

  async getUserAlbumLikesById(albumId) {
    try {
      const result = await this._cacheService.get(`album-likes:${albumId}`);
      return {
        source: 'cache',
        albumLikes: JSON.parse(result)
      };
    } catch (error) {
      const queryAlbum = {
        text: 'SELECT id FROM albums WHERE id = $1',
        values: [albumId]
      };
      const resultAlbum = await this._pool.query(queryAlbum);
      if (!resultAlbum.rows.length) {
        throw new NotFoundError('Album tidak ditemukan');
      }

      const queryLikes = {
        text: 'SELECT COUNT(user_id) FROM user_album_likes WHERE album_id = $1',
        values: [albumId]
      };
      const resultLikes = await this._pool.query(queryLikes);
      const resultLikesNumber = Number(resultLikes.rows[0].count);

      await this._cacheService.set(`album-likes:${albumId}`, JSON.stringify(resultLikesNumber));

      return {
        source: 'database',
        albumLikes: resultLikesNumber
      };
    }
  }

  async deleteUserAlbumLikeById(userId, albumId) {
  // Pastikan album ada
  const queryAlbum = {
    text: 'SELECT id FROM albums WHERE id = $1',
    values: [albumId],
  };
  const resultAlbum = await this._pool.query(queryAlbum);
  if (!resultAlbum.rows.length) {
    throw new NotFoundError('Album tidak ditemukan');
  }

  const queryCheckLike = {
    text: 'SELECT id FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
    values: [userId, albumId],
  };
  const resultCheckLike = await this._pool.query(queryCheckLike);
  if (!resultCheckLike.rows.length) {
    throw new NotFoundError('Anda belum menyukai album ini');
  }

  const queryDelete = {
    text: 'DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id',
    values: [userId, albumId],
  };
  const resultDelete = await this._pool.query(queryDelete);
  if (!resultDelete.rows.length) {
    throw new InvariantError('Gagal membatalkan like album');
  }

  await this._cacheService.delete(`album-likes:${albumId}`);
}

}

module.exports = AlbumsService;
