export function Footer() {
  return (
    <footer className="border-t border-border bg-base">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/15 text-xs">
            🧵
          </span>
          <span className="font-medium text-text text-sm">loop-task</span>
        </div>

        {/* Copyright */}
        <p className="text-text-muted text-xs">
          MIT &copy;{' '}
          <a
            href="https://ckgrafico.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-sec hover:text-text transition-colors"
          >
            ckgrafico
          </a>
        </p>

        {/* Links */}
        <div className="flex items-center gap-4 text-xs text-text-sec">
          <a
            href="https://ckgrafico.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text transition-colors"
          >
            Author
          </a>
          <a
            href="https://github.com/ckgrafico/loop-task"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/loop-task"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text transition-colors"
          >
            npm
          </a>
        </div>
      </div>
    </footer>
  );
}
