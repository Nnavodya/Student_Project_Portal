import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiHeart,
  FiEye,
  FiGithub,
  FiExternalLink,
  FiArrowLeft,
  FiEdit2,
  FiEyeOff,
  FiMessageCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';

// SECURITY FIX: only allow http:/https: URLs to be rendered as links.
// Blocks "javascript:" and other dangerous URI schemes (Stored XSS).
const isSafeUrl = (url) => {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [posting, setPosting] = useState(false);

  const loadComments = async () => {
    try {
      const res = await api.get(`/projects/${id}/comments`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    api.get(`/projects/${id}`)
      .then((res) => {
        const proj = res.data.project || {};
        setProject(proj);
        setLikeCount(proj.likeCount ?? proj.like_count ?? 0);
        setLiked(proj.liked ?? proj.is_liked ?? false);
      })
      .catch(() => toast.error('Project not found.'))
      .finally(() => setLoading(false));

    loadComments();
  }, [id]);

  const handleCommentSubmit = async () => {
    if (!user) {
      toast.error('Sign in to comment.');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty.');
      return;
    }

    try {
      setPosting(true);

      await api.post(`/projects/${id}/comments`, {
        content: commentText,
        is_private: isPrivate,
      });

      setCommentText('');
      setIsPrivate(false);
      loadComments();

      toast.success('Comment added.');
    } catch (err) {
      toast.error('Failed to add comment.');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Sign in to like projects.');
      return;
    }
    try {
      const res = await api.post(`/projects/${id}/like`);
      const data = res.data || {};
      setLiked(data.liked ?? data.is_liked ?? liked);
      setLikeCount(data.likeCount ?? data.like_count ?? likeCount);
    } catch {
      toast.error('Could not update like.');
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!project) return null;

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <FiArrowLeft size={15} /> Back to Projects
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Thumbnail */}
          {project.thumbnail_url && (
            <div className="rounded-2xl overflow-hidden mb-8 h-72 bg-gray-100">
              <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex flex-col gap-8">
            {/* Main */}
            <div>
              {/* Tags */}
              {project.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{project.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                  <span className="flex items-center gap-1.5">
                    <FiEye size={16} /> {project.view_count} Views
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiHeart size={16} /> {likeCount} Likes
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleLike}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    liked
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                  }`}
                >
                  <FiHeart size={16} className={liked ? 'fill-current' : ''} />
                  <span>
                    {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                  </span>
                </button>

                {isSafeUrl(project.github_url) && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
                  >
                    <FiGithub size={16} />
                    <span>GitHub</span>
                  </a>
                )}

                {isSafeUrl(project.demo_url) && (
                  <a
                    href={project.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <FiExternalLink size={16} />
                    <span>Live Demo</span>
                  </a>
                )}

                {user?.id === project.user_id && user?.role !== 'admin' && (
                  <Link
                    to={`/projects/${project.id}/edit`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <FiEdit2 size={16} />
                    <span>Edit Project</span>
                  </Link>
                )}

                {user?.role === 'admin' && (
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 sm:border-l sm:border-gray-200 sm:pl-3">
                    <Link
                      to={`/admin/projects/${project.id}/edit`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                    >
                      <FiEdit2 size={16} />
                      <span>Edit Project</span>
                    </Link>
                    <button
                      onClick={async () => {
                        const nextStatus = project.status === 'published' ? 'draft' : 'published';
                        try {
                          const formData = new FormData();
                          formData.append('title', project.title);
                          formData.append('description', project.description);
                          formData.append('status', nextStatus);
                          if (project.github_url) formData.append('github_url', project.github_url);
                          if (project.demo_url) formData.append('demo_url', project.demo_url);
                          formData.append('tech_stack', JSON.stringify(project.tech_stack || []));
                          formData.append('tags', JSON.stringify(project.tags || []));

                          await api.put(`/projects/${project.id}`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                          });

                          setProject((p) => ({ ...p, status: nextStatus }));
                          toast.success(`Project marked as ${nextStatus}`);
                        } catch {
                          toast.error('Failed to toggle status');
                        }
                      }}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer border ${
                        project.status === 'published'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'
                      }`}
                    >
                      {project.status === 'published' ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                      <span>{project.status === 'published' ? 'Hide from Public' : 'Publish Project'}</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-gray-600 leading-relaxed mb-6">{project.description}</p>

              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex-1">
                  {/* Tech Stack */}
                  {project.tech_stack?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Tech Stack</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.tech_stack.map((tech) => (
                          <span key={tech} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Author card */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm w-full md:w-72 flex-shrink-0">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Project Author</h3>
                  <Link to={`/profile/${project.user_id}`} className="flex items-center gap-3 group">
                    {project.author_pic ? (
                      <img src={project.author_pic} alt={project.author_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold">
                        {project.author_name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors">{project.author_name}</p>
                      {project.student_id && <p className="text-xs text-gray-400">{project.student_id}</p>}
                    </div>
                  </Link>
                </div>
              </div>

              {/* Comments Section */}
              <div className="mt-10">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiMessageCircle />
                  Comments
                </h2>

                {user && (
                  <div className="mb-6">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="w-full border border-gray-200 rounded-xl p-3"
                      rows={4}
                    />

                    <div className="flex items-center justify-between mt-3">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isPrivate}
                          onChange={(e) => setIsPrivate(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        Make this comment private
                        <span className="text-gray-400">{isPrivate ? '(only you and the project owner can see it)' : '(visible to everyone)'}</span>
                      </label>

                      <button onClick={handleCommentSubmit} disabled={posting} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                        {posting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                )}

                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {comments.length === 0 ? (
                    <p className="text-gray-500">No comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-white border border-gray-100 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <Link to={`/profile/${comment.user_id}`} className="font-medium hover:text-green-600 transition-colors">
                            {comment.author_name}
                          </Link>
                          <div className="flex items-center gap-2">
                            {comment.is_private && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                                Private
                              </span>
                            )}
                            {user && (user.id === comment.user_id || user.role === 'admin') && (
                              <button
                                onClick={async () => {
                                  if (!window.confirm('Delete this comment?')) return;
                                  try {
                                    await api.delete(`/projects/${id}/comments/${comment.id}`);
                                    setComments((prev) => prev.filter((c) => c.id !== comment.id));
                                    toast.success('Comment deleted.');
                                  } catch {
                                    toast.error('Failed to delete comment.');
                                  }
                                }}
                                className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-600 mt-2">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}