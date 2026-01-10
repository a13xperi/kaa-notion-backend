/**
 * Not Found Page (404)
 * Displayed when a route doesn't exist.
 */

import './NotFoundPage.css';

interface NotFoundPageProps {
  title?: string;
  message?: string;
  showHomeLink?: boolean;
  showBackLink?: boolean;
}

export function NotFoundPage({
  title = 'Page Not Found',
  message = "Sorry, we couldn't find the page you're looking for.",
  showHomeLink = true,
  showBackLink = true,
}: NotFoundPageProps) {
  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="not-found">
      <div className="not-found__content">
        <div className="not-found__icon">🌿</div>
        <h1 className="not-found__code">404</h1>
        <h2 className="not-found__title">{title}</h2>
        <p className="not-found__message">{message}</p>
        
        <div className="not-found__actions">
          {showBackLink && (
            <button
              onClick={handleGoBack}
              className="not-found__button not-found__button--secondary"
            >
              ← Go Back
            </button>
          )}
          {showHomeLink && (
            <a href="/" className="not-found__button not-found__button--primary">
              Return Home
            </a>
          )}
        </div>

        <div className="not-found__help">
          <p>Looking for something specific?</p>
          <ul>
            <li><a href="/pricing">View Pricing</a></li>
            <li><a href="/portal">Client Portal</a></li>
            <li><a href="/contact">Contact Support</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
