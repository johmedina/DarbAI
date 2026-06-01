import { ThemeToggle } from "./theme-toggle";
import logo from "@/assets/images/logo.png";

export const Header = () => {
  return (
    <header className="flex items-center justify-between px-4 sm:px-4 py-1 bg-background text-black dark:text-white w-full">
      <div className="flex items-center">
        {/*
          Import the logo as a module (Vite resolves it to a hashed URL like
          /assets/logo-Dz3r8QaR.png). This works correctly on ALL routes,
          after hard refresh, and in production builds — unlike the bare string
          "src/assets/images/logo.png" which breaks on any sub-route.
        */}
        <img src={logo} alt="Logo" className="h-20 w-auto" />
      </div>
      <div className="flex items-center">
        <ThemeToggle />
      </div>
    </header>
  );
};
