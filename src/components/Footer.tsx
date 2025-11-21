const Footer = () => {
  return (
    <footer className="w-full border-t border-border bg-background py-4 px-6 mt-auto">
      <div className="relative">
        <div className="absolute left-0 top-0">
          <p className="text-xs text-muted-foreground/60">v1.25.0</p>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            © 2025 XZ1 Recording Ventures. All rights reserved
          </p>
          <p className="text-sm text-muted-foreground">
            Need help? Shoot us an{" "}
            <a 
              href="mailto:contact@trackball.cc" 
              className="text-primary hover:underline transition-colors"
            >
              email
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
