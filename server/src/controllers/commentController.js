const pool = require('../config/db');
const emitter = require('../events/eventEmitter');

/**
 * GET /api/projects/:id/comments
 *
 * Visibility rules:
 *   - Public comments  (is_private = FALSE) -> visible to everyone
 *   - Private comments (is_private = TRUE)  -> visible ONLY to the comment's
 *       author and to admins. NOT visible to the project owner (unless the
 *       project owner is also the comment's author or an admin).
 */
const getProjectComments = async (req, res) => {
  try {
    const { id } = req.params;

    const projectResult = await pool.query('SELECT user_id FROM projects WHERE id = $1', [id]);
    if (!projectResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const currentUserId = req.user ? req.user.id : null;
    const isAdmin = req.user ? req.user.role === 'admin' : false;

    const result = await pool.query(
      `SELECT n.id, n.message AS content, n.created_at, u.name AS author_name, u.profile_pic AS author_pic, u.role AS author_role, n.actor_id AS user_id, n.is_private
       FROM notifications n
       JOIN users u ON n.actor_id = u.id
       WHERE n.project_id = $1 AND n.type = 'comment'
       ORDER BY n.created_at ASC`,
      [parseInt(id, 10)]
    );

    let comments = result.rows;

    // SECURITY FIX: private comments are visible ONLY to their author or an
    // admin — matches the documented rule above. Project owner no longer
    // gets special-cased access (they weren't supposed to per the docstring),
    // and admins are now correctly included (previously missing entirely).
    comments = comments.filter(c => {
      if (!c.is_private) return true;
      if (currentUserId === c.user_id) return true;
      if (isAdmin) return true;
      return false;
    });

    res.json({ success: true, comments });
  } catch (err) {
    console.error('[getProjectComments]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * POST /api/projects/:id/comments
 * Body: { content: string, is_private?: boolean }
 *
 * Any authenticated user (student, recruiter, or admin) can post a comment,
 * and can mark it public or private.
 *
 * Emits 'CommentAdded' so the notification is created entirely through the
 * event system (never directly here) — same pattern as ProjectLiked.
 */
const createComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, is_private } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required.' });
    }

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (!projectResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const project = projectResult.rows[0];
    const isPrivate = is_private === true || is_private === 'true';

    const insertResult = await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, project_id, type, message, is_private)
       VALUES ($1, $2, $3, 'comment', $4, $5) RETURNING *`,
      [project.user_id, req.user.id, project.id, content.trim(), isPrivate]
    );

    const notification = insertResult.rows[0];

    const comment = {
      id: notification.id,
      content: content.trim(),
      is_private: isPrivate,
      author_name: req.user.name,
      author_pic: req.user.profile_pic,
      user_id: req.user.id,
      created_at: notification.created_at
    };

    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error('[createComment]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * DELETE /api/projects/:id/comments/:commentId
 * Only the comment's author or an admin can delete it.
 */
const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    const existing = await pool.query("SELECT * FROM notifications WHERE id = $1 AND type = 'comment'", [commentId]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    const comment = existing.rows[0];

    // SECURITY FIX (IDOR): verify the comment actually belongs to the
    // project specified in the URL, not just that a comment with this ID
    // exists somewhere. Without this, a user could pass any commentId in
    // combination with a project :id they don't own/control and still
    // delete a comment that belongs to a completely different project.
    if (comment.project_id !== parseInt(id, 10)) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    const isOwner = comment.actor_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    await pool.query('DELETE FROM notifications WHERE id = $1', [commentId]);
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) {
    console.error('[deleteComment]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getProjectComments, createComment, deleteComment };