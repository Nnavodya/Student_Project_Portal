import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiEye, FiGithub, FiExternalLink, FiCode } from 'react-icons/fi';

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

export default function ProjectCard({ project, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Thumbnail */}
      <Link to={`/projects/${project.id}`} className="block overflow-hidden h-44 bg-gradient-to-br from-green-50 to-emerald-100 relative">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiCode size={40} className="text-green-300" />
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100">
                {tag}
              </span>
            ))}
          </div>
        )}

        <Link to={`/projects/${project.id}`}>
          <h3 className="font-semibold text-gray-900 text-base leading-snug hover:text-green-700 transition-colors line-clamp-2 mb-2">
            {project.title}
          </h3>
        </Link>
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
          {project.description}
        </p>

        {/* Author */}
        <Link to={`/profile/${project.user_id}`} className="flex items-center gap-2 mb-4 group/author">
          {project.author_pic ? (
            <img src={project.author_pic} alt={project.author_name} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              {project.author_name?.[0]}
            </div>
          )}
          <span className="text-xs text-gray-500 group-hover/author:text-gray-700 transition-colors">
            {project.author_name}
            {project.student_id && <span className="ml-1 text-gray-400">· {project.student_id}</span>}
          </span>
        </Link>

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <span className="flex items-center gap-1">
              <FiHeart size={13} /> {project.like_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <FiEye size={13} /> {project.view_count || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSafeUrl(project.github_url) && (
              <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                onClick={(e) => e.stopPropagation()}>
                <FiGithub size={14} />
              </a>
            )}
            {isSafeUrl(project.demo_url) && (
              <a href={project.demo_url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                onClick={(e) => e.stopPropagation()}>
                <FiExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}