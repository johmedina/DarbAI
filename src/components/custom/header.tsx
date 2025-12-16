import { ThemeToggle } from "./theme-toggle";

export const Header = () => {
  return (
    <>
      <header className="flex items-center justify-between px-4 sm:px-4 py-1 bg-background text-black dark:text-white w-full">
        <div className="flex items-center">
          <img src="src/assets/images/logo.png" alt="Logo" className="h-20 w-auto" />
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </header>
    </>
  );
};