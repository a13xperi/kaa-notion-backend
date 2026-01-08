import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import './DarkModeToggle.css';

const DarkModeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      className={`dark-mode-toggle ${isDarkMode ? 'dark' : 'light'}`}
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div className="toggle-track">
        <div className="toggle-thumb">
          <span className="toggle-icon">
            {isDarkMode ? '🌙' : '☀️'}
          </span>
        </div>
      </div>
    </button>
  );
};

export default DarkModeToggle;
