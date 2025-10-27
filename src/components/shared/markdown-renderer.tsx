import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const components: Components = {
    // Custom rendering for code blocks
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      
      return !isInline ? (
        <div className="relative group my-4">
          <pre className="!bg-zinc-900 !p-4 !rounded-lg overflow-x-auto !my-4">
            <code className={`${className} !text-sm`} {...props}>
              {children}
            </code>
          </pre>
          {match && (
            <div className="absolute top-2 right-2 text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
              {match[1]}
            </div>
          )}
        </div>
      ) : (
        <code className="!bg-zinc-800 !text-zinc-200 !px-1.5 !py-0.5 !rounded !text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    // Custom rendering for links
    a({ children, href, ...props }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline"
          {...props}
        >
          {children}
        </a>
      );
    },
    // Custom rendering for tables
    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-6">
          <table className="min-w-full divide-y divide-zinc-700 border border-zinc-700 rounded-lg text-sm" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children, ...props }) {
      return (
        <thead className="bg-zinc-800" {...props}>
          {children}
        </thead>
      );
    },
    tbody({ children, ...props }) {
      return (
        <tbody className="divide-y divide-zinc-700/50" {...props}>
          {children}
        </tbody>
      );
    },
    th({ children, ...props }) {
      return (
        <th className="px-4 py-3 text-left text-sm font-semibold" {...props}>
          {children}
        </th>
      );
    },
    td({ children, ...props }) {
      return (
        <td className="px-4 py-3 text-sm" {...props}>
          {children}
        </td>
      );
    },
    // Custom rendering for blockquotes
    blockquote({ children, ...props }) {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-5 pr-4 py-3 my-6 italic bg-zinc-800/50 rounded-r leading-7 text-[0.925rem]" {...props}>
          {children}
        </blockquote>
      );
    },
    // Custom rendering for lists
    ul({ children, ...props }) {
      return (
        <ul className="space-y-1.5 my-4 pl-0" {...props}>
          {children}
        </ul>
      );
    },
    ol({ children, ...props }) {
      return (
        <ol className="space-y-1.5 my-4 pl-0" {...props}>
          {children}
        </ol>
      );
    },
    li({ children, ...props }) {
      return (
        <li className="leading-7 ml-6 pl-2 relative before:content-['•'] before:absolute before:left-[-1.25rem] before:text-muted-foreground before:font-bold" {...props}>
          {children}
        </li>
      );
    },
    p({ children, ...props }) {
      return (
        <p className="leading-7 my-4 text-[0.925rem]" {...props}>
          {children}
        </p>
      );
    },
    strong({ children, ...props }) {
      return (
        <strong className="font-bold text-foreground" {...props}>
          {children}
        </strong>
      );
    },
    em({ children, ...props }) {
      return (
        <em className="italic text-foreground/90" {...props}>
          {children}
        </em>
      );
    },
    // Custom rendering for headings
    h1({ children, ...props }) {
      return (
        <h1 className="text-3xl font-bold mt-8 mb-4 pb-3 border-b-2 border-zinc-700 leading-tight" {...props}>
          {children}
        </h1>
      );
    },
    h2({ children, ...props }) {
      return (
        <h2 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-zinc-700/50 leading-tight" {...props}>
          {children}
        </h2>
      );
    },
    h3({ children, ...props }) {
      return (
        <h3 className="text-xl font-semibold mt-6 mb-3 leading-tight" {...props}>
          {children}
        </h3>
      );
    },
    h4({ children, ...props }) {
      return (
        <h4 className="text-lg font-semibold mt-5 mb-2.5 leading-tight" {...props}>
          {children}
        </h4>
      );
    },
    h5({ children, ...props }) {
      return (
        <h5 className="text-base font-semibold mt-4 mb-2 leading-tight" {...props}>
          {children}
        </h5>
      );
    },
    h6({ children, ...props }) {
      return (
        <h6 className="text-sm font-semibold mt-4 mb-2 leading-tight uppercase tracking-wide text-muted-foreground" {...props}>
          {children}
        </h6>
      );
    },
    // Custom rendering for horizontal rules
    hr({ ...props }) {
      return <hr className="my-8 border-zinc-700" {...props} />;
    },
    // Custom rendering for images
    img({ src, alt, ...props }) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="rounded-lg max-w-full h-auto my-4"
          {...props}
        />
      );
    },
  };

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeHighlight,
          rehypeKatex,
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
