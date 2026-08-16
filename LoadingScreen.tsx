export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
      <div className="loader-wrapper">
        <span className="loader-letter">L</span>
        <span className="loader-letter">O</span>
        <span className="loader-letter">A</span>
        <span className="loader-letter">D</span>
        <span className="loader-letter">I</span>
        <span className="loader-letter">N</span>
        <span className="loader-letter">G</span>
        <span className="loader-letter">.</span>
        <span className="loader-letter">.</span>
        <span className="loader-letter">.</span>
        <div className="loader"></div>
      </div>
    </div>
  );
}
